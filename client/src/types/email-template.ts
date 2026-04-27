// 邮件模板类型定义

export interface EmailTemplate {
  id: number;
  userId: number;
  name: string;
  subject: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmailTemplateData {
  name: string;
  subject: string;
  body: string;
}

export interface UpdateEmailTemplateData {
  name?: string;
  subject?: string;
  body?: string;
}

// 发送邮件相关
export interface SendEmailData {
  templateId?: number;
  candidateIds: number[];
  subject: string;
  body: string;
  fromEmailId: number;
}

/** 群发邮件发送统计（与 GET /v1/email-send-stats 一致） */
export interface EmailSendStats {
  totalSent: number;
  todaySent: number;
  monthSent: number;
}

export interface SendEmailResult {
  success: boolean;
  message: string;
  sentCount: number;
  failedCount: number;
  /** 实际发送成功的候选人 ID（与后端一致） */
  successfulCandidateIds?: number[];
}

// 收件人类型（从简历表获取）
export interface EmailRecipient {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  /** 邮件发送页展示状态：sent 优先于简历审核状态 */
  status: 'pending' | 'passed' | 'rejected' | 'sent';
  resumeFile: string | null;
  originalFileName: string | null;
  /** 后端写入：最近一次群发邮件发送成功的时间（ISO 字符串） */
  lastEmailSentAt?: string | null;
}
