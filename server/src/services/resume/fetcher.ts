// 使用 require 进行手动导入
const Imap = require('imap');
import { simpleParser } from 'mailparser';
import path from 'path';
import fs from 'fs';
import { db } from '../../db/index.js';
import { emailConfigs } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { decrypt } from '../../utils/crypto';
import { ensureResumeUploadDir, getResumeUploadDir } from '../../utils/uploadPaths.js';

export interface EmailMessage {
  from: string;
  subject: string;
  date: Date;
  attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export interface FetchEmailOptions {
  configId: number;
  userId: number;
  since?: Date; // 获取指定日期之后的邮件
  limit?: number; // 限制获取的邮件数量
}

/**
 * 获取邮箱配置（解密后返回）
 */
async function getEmailConfig(userId: number, configId: number) {
  const [config] = await db
    .select()
    .from(emailConfigs)
    .where(eq(emailConfigs.id, configId));

  if (!config) {
    throw new Error('邮箱配置不存在');
  }

  if (config.userId !== userId) {
    throw new Error('无权访问此邮箱配置');
  }

  // authCode 加密存储，使用前解密
  return { ...config, authCode: decrypt(config.authCode) };
}

/**
 * 连接到 IMAP 服务器
 */
function connectToImap(config: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const imapConfig = {
      user: config.email,
      password: config.authCode,
      host: config.imapHost || 'imap.qq.com',
      port: config.imapPort || 993,
      tls: true,
      tlsOptions: {
        rejectUnauthorized: false,
      },
    };

    const imap = new Imap(imapConfig);

    imap.once('ready', () => {
      resolve(imap);
    });

    imap.once('error', (err: Error) => {
      reject(err);
    });

    imap.connect();
  });
}

/**
 * 从邮箱获取邮件（包含简历附件）
 */
export async function fetchEmailsWithAttachments(
  options: FetchEmailOptions
): Promise<EmailMessage[]> {
  const { configId, userId, since, limit = 10 } = options;

  // 获取邮箱配置
  const config = await getEmailConfig(userId, configId);

  // 连接到 IMAP
  const imap = await connectToImap(config);

  // 获取所有邮箱文件夹
  const mailboxes = await new Promise<any>((resolve, reject) => {
    imap.getBoxes('', (err: Error | null, boxes: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(boxes);
      }
    });
  });

  // 递归打印所有邮箱名字
  function printMailboxes(boxes: any, prefix = '') {
    for (const [name, box] of Object.entries(boxes)) {
      const fullPath = prefix ? `${prefix}/${name}` : name;
      if ((box as any).children) {
        printMailboxes((box as any).children, fullPath);
      }
    }
  }
  printMailboxes(mailboxes);

  try {
    return await new Promise((resolve, reject) => {
      // 打开收件箱
      imap.openBox('INBOX', false, async (err: Error | null, box: any) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        // 构建搜索条件 - 默认获取最近7天的邮件
        const sinceDate = since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        // 格式化日期为 IMAP 所需的格式 (如: "9-Mar-2026")
        const formatDateForImap = (date: Date) => {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`;
        };
        const searchCriteria: any[] = ['ALL', ['SINCE', formatDateForImap(sinceDate)]];
        
        // 搜索邮件
        imap.search(searchCriteria, async (err: Error | null, results: number[]) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          if (results.length === 0) {
            imap.end();
            return resolve([]);
          }

          // 只获取最新的 N 封邮件
          const messagesToFetch = results.slice(-limit);

          const fetch = imap.fetch(messagesToFetch, {
            bodies: '',
            struct: true,
            markSeen: false,
          });

          const emails: EmailMessage[] = [];
          const allEmails: Array<{
            from: string;
            subject: string;
            date: Date;
            hasResume: boolean;
            attachments: string[];
          }> = [];
          
          // 追踪所有待完成的异步操作
          let pendingOperations = 0;
          const operationComplete = () => {
            pendingOperations--;
          };

          fetch.on('message', (msg: any) => {
            let emailData: EmailMessage | null = null;
            pendingOperations++; // 开始处理邮件

            msg.on('body', async (stream: any) => {
              try {
                const parsed = await simpleParser(stream);
                
                // 查找附件
                const attachments: EmailMessage['attachments'] = [];
                
                if (parsed.attachments && parsed.attachments.length > 0) {
                  for (const attachment of parsed.attachments) {
                    // 只处理 PDF 和 Word 文档
                    const contentType = attachment.contentType?.toLowerCase() || '';
                    if (
                      contentType.includes('pdf') ||
                      contentType.includes('word') ||
                      contentType.includes('document') ||
                      attachment.filename?.match(/\.(pdf|docx?|doc)$/i)
                    ) {
                      // 获取附件内容
                      const content = (attachment as any).content;
                      if (content) {
                        attachments.push({
                          filename: attachment.filename || 'unknown',
                          content: Buffer.from(content),
                          contentType: contentType,
                        });
                      }
                    }
                  }
                }

                // 记录所有邮件的基本信息
                const emailInfo = {
                  from: parsed.from?.text || parsed.from?.address || '未知',
                  subject: parsed.subject || '无主题',
                  date: parsed.date || new Date(),
                  hasResume: attachments.length > 0,
                  attachments: attachments.map(a => a.filename),
                };
                allEmails.push(emailInfo);

                // 只返回包含简历附件的邮件
                if (attachments.length > 0) {
                  emailData = {
                    from: emailInfo.from,
                    subject: emailInfo.subject,
                    date: emailInfo.date,
                    attachments,
                  };
                  emails.push(emailData);
                }
              } catch (parseErr) {
                // 忽略解析错误
              } finally {
                operationComplete(); // 标记处理完成
              }
            });

            msg.once('error', () => {
              // 忽略消息处理错误
            });
          });

          fetch.once('error', (fetchErr: Error) => {
            imap.end();
            reject(fetchErr);
          });

          fetch.once('end', () => {
            // 等待所有邮件处理完成
            const checkAndResolve = () => {
              if (pendingOperations === 0) {
                imap.end();
                resolve(emails);
              } else {
                // 还有未完成的操作，等待一下再检查
                setTimeout(checkAndResolve, 100);
              }
            };
            
            checkAndResolve();
          });
        });
      });
    });
  } catch (error) {
    if (imap) {
      imap.end();
    }
    throw error;
  }
}

/**
 * 保存邮件附件到简历目录
 */
export function saveAttachmentToResume(
  content: Buffer,
  filename: string,
  userId: number
): { filePath: string; originalFileName: string } {
  ensureResumeUploadDir();
  const uploadDir = getResumeUploadDir();

  // 解码文件名（处理 URL 编码的中文文件名）
  let decodedFilename = filename;
  try {
    decodedFilename = decodeURIComponent(filename);
  } catch {
    // 忽略解码错误，使用原始文件名
  }

  // 生成唯一文件名
  const ext = path.extname(decodedFilename);
  const baseName = path.basename(decodedFilename, ext);
  const timestamp = Date.now();
  const uniqueFilename = `${baseName}_${timestamp}${ext}`;
  const filePath = path.join(uploadDir, uniqueFilename);

  // 写入文件
  fs.writeFileSync(filePath, content);

  return {
    filePath,
    originalFileName: decodedFilename,
  };
}

/**
 * 测试 IMAP 连接
 */
export async function testImapConnection(configId: number, userId: number): Promise<boolean> {
  const config = await getEmailConfig(userId, configId);
  
  try {
    const imap = await connectToImap(config);
    return new Promise((resolve) => {
      imap.once('ready', () => {
        imap.end();
        resolve(true);
      });
      imap.once('error', () => {
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}
