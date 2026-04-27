import instance from "../utils/http";
import type { EmailConfig, CreateEmailConfigData, UpdateEmailConfigData, TestEmailConfigResult } from "../types/email";

// 获取邮箱配置列表
export const getEmailConfigs = async (): Promise<EmailConfig[]> => {
  return instance.get("/v1/emails");
};

// 获取单个邮箱配置
export const getEmailConfigById = async (id: number): Promise<EmailConfig> => {
  return instance.get(`/v1/emails/${id}`);
};

// 创建邮箱配置
export const createEmailConfig = async (data: CreateEmailConfigData): Promise<EmailConfig> => {
  return instance.post("/v1/emails", data);
};

// 更新邮箱配置
export const updateEmailConfig = async (id: number, data: UpdateEmailConfigData): Promise<EmailConfig> => {
  return instance.put(`/v1/emails/${id}`, data);
};

// 删除邮箱配置
export const deleteEmailConfig = async (id: number): Promise<void> => {
  return instance.delete(`/v1/emails/${id}`);
};

// 测试邮箱配置
export const testEmailConfig = async (id: number): Promise<TestEmailConfigResult> => {
  return instance.post(`/v1/emails/${id}/test`);
};
