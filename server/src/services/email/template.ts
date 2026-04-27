import { db } from '../../db/index.js';
import { emailTemplates, emailConfigs, resumes, activities } from '../../db/schema.js';
import { eq, and, desc, isNotNull, isNull, inArray, like, gte, lt, sql } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { decrypt } from '../../utils/crypto';
import type {
  EmailTemplateInput,
  EmailTemplateResponse,
  SendEmailInput,
  SendEmailResult,
  EmailRecipient,
  EmailSendStats,
} from '../../types/email-template.js';

// 重新导出类型供外部使用
export type {
  EmailTemplateInput,
  EmailTemplateResponse,
  SendEmailInput,
  SendEmailResult,
  EmailRecipient,
  EmailSendStats,
};

/** 与群发成功时写入活动表的 description 前缀一致，用于统计「封」数 */
const EMAIL_SENT_ACTIVITY_PREFIX = '发送面试邀请:';

/**
 * 按活动流水统计群发成功次数（每条成功投递对应一条 interview 活动）
 */
export async function getEmailSendStats(userId: number): Promise<EmailSendStats> {
  const activityMatch = and(
    eq(activities.userId, userId),
    eq(activities.type, 'interview'),
    like(activities.description, `${EMAIL_SENT_ACTIVITY_PREFIX}%`),
  );

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(activities)
    .where(activityMatch);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [todayRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(activities)
    .where(
      and(
        activityMatch,
        gte(activities.createdAt, startOfDay.toISOString()),
        lt(activities.createdAt, endOfDay.toISOString()),
      ),
    );

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [monthRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(activities)
    .where(
      and(
        activityMatch,
        gte(activities.createdAt, monthStart.toISOString()),
        lt(activities.createdAt, monthEnd.toISOString()),
      ),
    );

  return {
    totalSent: Number(totalRow?.count ?? 0),
    todaySent: Number(todayRow?.count ?? 0),
    monthSent: Number(monthRow?.count ?? 0),
  };
}

// 获取用户的邮件模板列表
export async function getEmailTemplates(userId: number): Promise<EmailTemplateResponse[]> {
  const templates = await db
    .select({
      id: emailTemplates.id,
      userId: emailTemplates.userId,
      name: emailTemplates.name,
      subject: emailTemplates.subject,
      body: emailTemplates.body,
      createdAt: emailTemplates.createdAt,
      updatedAt: emailTemplates.updatedAt,
    })
    .from(emailTemplates)
    .where(eq(emailTemplates.userId, userId));

  return templates;
}

// 获取单个邮件模板
export async function getEmailTemplateById(
  userId: number,
  templateId: number
): Promise<EmailTemplateResponse | null> {
  const [template] = await db
    .select({
      id: emailTemplates.id,
      userId: emailTemplates.userId,
      name: emailTemplates.name,
      subject: emailTemplates.subject,
      body: emailTemplates.body,
      createdAt: emailTemplates.createdAt,
      updatedAt: emailTemplates.updatedAt,
    })
    .from(emailTemplates)
    .where(and(
      eq(emailTemplates.id, templateId),
      eq(emailTemplates.userId, userId)
    ));

  return template || null;
}

// 创建邮件模板
export async function createEmailTemplate(
  userId: number,
  data: EmailTemplateInput
): Promise<EmailTemplateResponse> {
  const [template] = await db
    .insert(emailTemplates)
    .values({
      userId,
      name: data.name,
      subject: data.subject,
      body: data.body,
    })
    .returning();

  return template;
}

// 更新邮件模板
export async function updateEmailTemplate(
  userId: number,
  templateId: number,
  data: Partial<EmailTemplateInput>
): Promise<EmailTemplateResponse> {
  // 检查模板是否存在且属于该用户
  const existing = await getEmailTemplateById(userId, templateId);
  if (!existing) {
    throw new Error('邮件模板不存在');
  }

  // 构建更新数据
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.subject !== undefined) updateData.subject = data.subject;
  if (data.body !== undefined) updateData.body = data.body;

  await db
    .update(emailTemplates)
    .set(updateData)
    .where(and(
      eq(emailTemplates.id, templateId),
      eq(emailTemplates.userId, userId)
    ));

  const updated = await getEmailTemplateById(userId, templateId);
  if (!updated) {
    throw new Error('更新失败');
  }

  return updated;
}

// 删除邮件模板
export async function deleteEmailTemplate(
  userId: number,
  templateId: number
): Promise<void> {
  const existing = await getEmailTemplateById(userId, templateId);
  if (!existing) {
    throw new Error('邮件模板不存在');
  }

  await db
    .delete(emailTemplates)
    .where(and(
      eq(emailTemplates.id, templateId),
      eq(emailTemplates.userId, userId)
    ));
}

// 获取邮箱配置（用于发送邮件）
export async function getEmailConfigById(
  userId: number,
  configId: number
): Promise<{
  id: number;
  email: string;
  authCode: string;
  smtpHost: string | null;
  smtpPort: number | null;
} | null> {
  const [config] = await db
    .select({
      id: emailConfigs.id,
      email: emailConfigs.email,
      authCode: emailConfigs.authCode,
      smtpHost: emailConfigs.smtpHost,
      smtpPort: emailConfigs.smtpPort,
    })
    .from(emailConfigs)
    .where(and(
      eq(emailConfigs.id, configId),
      eq(emailConfigs.userId, userId),
      eq(emailConfigs.isDeleted, 0)
    ));

  if (!config) return null;
  return { ...config, authCode: decrypt(config.authCode) };
}

// 变量替换函数
function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

export type RecipientStatusFilter =
  | 'pending'
  | 'passed'
  | 'rejected'
  | 'sent';

// 获取收件人列表（从 resumes 表，仅当前用户；可按筛选状态）
export async function getEmailRecipients(
  userId: number,
  status?: RecipientStatusFilter
): Promise<EmailRecipient[]> {
  const base = and(eq(resumes.userId, userId));

  const whereClause =
    status === 'sent'
      ? and(base, isNotNull(resumes.lastEmailSentAt))
      : status
        ? and(base, eq(resumes.status, status), isNull(resumes.lastEmailSentAt))
        : base;

  const rows = await db
    .select({
      id: resumes.id,
      name: resumes.name,
      email: resumes.email,
      phone: resumes.phone,
      status: resumes.status,
      resumeFile: resumes.resumeFile,
      originalFileName: resumes.originalFileName,
      lastEmailSentAt: resumes.lastEmailSentAt,
    })
    .from(resumes)
    .where(whereClause)
    .orderBy(desc(resumes.createdAt));

  return rows.map((row) => ({
    ...row,
    status: row.lastEmailSentAt
      ? 'sent'
      : (row.status as 'pending' | 'passed' | 'rejected'),
  }));
}

// 发送邮件
export async function sendEmails(
  userId: number,
  data: SendEmailInput
): Promise<SendEmailResult> {
  // 获取发件邮箱配置
  const emailConfig = await getEmailConfigById(userId, data.fromEmailId);
  
  if (!emailConfig) {
    throw new Error('邮箱配置不存在，请检查是否选择了正确的发件邮箱');
  }

  const allRecipients = await getEmailRecipients(userId);

  // 过滤需要发送的收件人
  const targetCandidates = allRecipients.filter(c => data.candidateIds.includes(c.id));

  if (targetCandidates.length === 0) {
    // 如果没有指定收件人，发送给所有人
    targetCandidates.push(...allRecipients);
  }

  if (targetCandidates.length === 0) {
    return {
      success: false,
      message: '没有可发送的收件人',
      sentCount: 0,
      failedCount: 0,
      successfulCandidateIds: [],
    };
  }

  // 验证 SMTP 配置
  if (!emailConfig.smtpHost || !emailConfig.smtpPort) {
    throw new Error('邮箱配置的 SMTP 服务器或端口未设置');
  }

  // 创建 nodemailer transporter
  const transporter = nodemailer.createTransport({
    host: emailConfig.smtpHost,
    port: emailConfig.smtpPort,
    secure: emailConfig.smtpPort === 465, // SSL
    auth: {
      user: emailConfig.email,
      pass: emailConfig.authCode,
    },
  });

  let sentCount = 0;
  let failedCount = 0;
  const successfulCandidateIds: number[] = [];

  // 逐个发送邮件
  for (const candidate of targetCandidates) {
    try {
      if (!candidate.email) {
        failedCount++;
        continue;
      }
      
      const variables = {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone || '',
        position: '应聘职位',
      };

      const subject = replaceVariables(data.subject, variables);
      const body = replaceVariables(data.body, variables);

      await transporter.sendMail({
        from: emailConfig.email,
        to: candidate.email,
        subject: subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
      });

      sentCount++;
      successfulCandidateIds.push(candidate.id);
    } catch (error) {
      console.error(`发送邮件给 ${candidate.email} 失败:`, error);
      failedCount++;
    }
  }

  if (successfulCandidateIds.length > 0) {
    const now = new Date().toISOString();
    await db
      .update(resumes)
      .set({ lastEmailSentAt: now })
      .where(
        and(eq(resumes.userId, userId), inArray(resumes.id, successfulCandidateIds)),
      );
  }

  return {
    success: sentCount > 0,
    message: `发送完成：成功 ${sentCount} 封，失败 ${failedCount} 封`,
    sentCount,
    failedCount,
    successfulCandidateIds,
  };
}
