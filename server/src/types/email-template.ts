// 邮件模板相关类型

// 创建邮件模板输入
export interface EmailTemplateInput {
  name: string;
  subject: string;
  body: string;
}

// 邮件模板响应
export interface EmailTemplateResponse {
  id: number;
  userId: number;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

// 发送邮件输入
export interface SendEmailInput {
  candidateIds: number[];
  subject: string;
  body: string;
  fromEmailId: number;
}

/** 邮件发送统计（按活动表「发送面试邀请」成功条数） */
export interface EmailSendStats {
  totalSent: number;
  todaySent: number;
  monthSent: number;
}

// 发送邮件结果
export interface SendEmailResult {
  success: boolean;
  message: string;
  sentCount: number;
  failedCount: number;
  /** 实际发送成功的候选人（简历）ID，供前端展示「发送成功」状态 */
  successfulCandidateIds: number[];
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
  /** 最近一次群发邮件发送成功时间，有值表示曾发送成功（SQLite TEXT / ISO） */
  lastEmailSentAt: string | null;
}
