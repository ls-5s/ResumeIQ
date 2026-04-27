import instance from "../utils/http";
import type {
  EmailTemplate,
  CreateEmailTemplateData,
  UpdateEmailTemplateData,
  SendEmailData,
  SendEmailResult,
  EmailRecipient,
  EmailSendStats,
} from "../types/email-template";

// 获取邮件模板列表
export const getEmailTemplates = async (): Promise<EmailTemplate[]> => {
  return instance.get("/v1/email-templates");
};

// 获取单个邮件模板
export const getEmailTemplateById = async (id: number): Promise<EmailTemplate> => {
  return instance.get(`/v1/email-templates/${id}`);
};

// 创建邮件模板
export const createEmailTemplate = async (data: CreateEmailTemplateData): Promise<EmailTemplate> => {
  return instance.post("/v1/email-templates", data);
};

// 更新邮件模板
export const updateEmailTemplate = async (id: number, data: UpdateEmailTemplateData): Promise<EmailTemplate> => {
  return instance.put(`/v1/email-templates/${id}`, data);
};

// 删除邮件模板
export const deleteEmailTemplate = async (id: number): Promise<void> => {
  return instance.delete(`/v1/email-templates/${id}`);
};

// 发送邮件
export const sendEmails = async (data: SendEmailData): Promise<SendEmailResult> => {
  return instance.post("/v1/emails/send", data);
};

/** 群发成功次数统计（活动表，按当前用户） */
export const getEmailSendStats = async (): Promise<EmailSendStats> => {
  return instance.get("/v1/email-send-stats");
};

// 获取收件人列表（支持按状态筛选；sent = 曾群发邮件成功过）
export const getEmailRecipients = async (
  status?: "pending" | "passed" | "rejected" | "sent",
): Promise<EmailRecipient[]> => {
  const params = status ? { status } : {};
  return instance.get("/v1/email-recipients", { params });
};
