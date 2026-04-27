import instance from "../utils/http";
import type { AiConfig, UpdateAiConfigData, CreateAiConfigData, AiScreeningResult, BatchScreenResult, InterviewQuestionResult } from "../types/ai";

/**
 * 测试 AI 配置
 */
export const testAiConfig = async (data: {
  model: string;
  apiUrl: string;
  apiKey: string;
  task?: string;
}): Promise<{ success: boolean; message: string }> => {
  return instance.post("/v1/ai/test", data);
};

/**
 * 获取 AI 配置列表
 */
export const getAiConfigs = async (): Promise<AiConfig[]> => {
  return instance.get("/v1/ai/list");
};

/**
 * 获取默认 AI 配置
 */
export const getAiConfig = async (): Promise<AiConfig> => {
  return instance.get("/v1/ai");
};

/**
 * 创建 AI 配置
 */
export const createAiConfig = async (data: CreateAiConfigData): Promise<AiConfig> => {
  return instance.post("/v1/ai", data);
};

/**
 * 更新 AI 配置
 */
export const updateAiConfig = async (id: number, data: UpdateAiConfigData): Promise<AiConfig> => {
  return instance.put(`/v1/ai/${id}`, data);
};

/**
 * 删除 AI 配置
 */
export const deleteAiConfig = async (id: number): Promise<void> => {
  return instance.delete(`/v1/ai/${id}`);
};

/**
 * 使用 AI 筛选单个简历
 */
export const screenResumeWithAi = async (data: {
  resumeId: number;
  jobRequirements: string;
  aiConfigId?: number;
}): Promise<AiScreeningResult> => {
  return instance.post('/v1/ai/screen', data);
};

/**
 * 批量使用 AI 筛选简历
 */
export const batchScreenResumesWithAi = async (data: {
  resumeIds: number[];
  jobRequirements: string;
  aiConfigId?: number;
}): Promise<BatchScreenResult[]> => {
  return instance.post('/v1/ai/batch-screen', data);
};

/**
 * 使用 AI 生成面试题
 */
export const generateInterviewQuestions = async (data: {
  resumeId: number;
  customFocus?: string;
  aiConfigId?: number;
  questionCount?: number;
}): Promise<InterviewQuestionResult> => {
  return instance.post("/v1/ai/interview-questions", data);
};