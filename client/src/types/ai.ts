export interface AiConfig {
  id: number | null;
  userId: number;
  name: string;
  model: string;
  apiUrl: string;
  apiKey: string;
  prompt: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateAiConfigData {
  name?: string;
  model?: string;
  apiUrl?: string;
  apiKey?: string;
  prompt?: string;
  isDefault?: boolean;
}

export interface CreateAiConfigData {
  name: string;
  model?: string;
  apiUrl?: string;
  apiKey?: string;
  prompt?: string;
  isDefault?: boolean;
}

/** 与后端 AI JSON 字段一致，七项 0–100；前端展示为简历关键板块标签 */
export interface AiDimensionScores {
  skills: number;
  projects: number;
  experience: number;
  education: number;
  fit: number;
  communication: number;
  campus: number;
}

export interface AiScreeningResult {
  recommendation: "pass" | "reject" | "pending";
  score: number;
  reasoning: string;
  /** 模型输出的分项分；旧数据或解析失败时可能为空 */
  dimensions?: AiDimensionScores;
}

export interface BatchScreenResult {
  resumeId: number;
  success: boolean;
  result?: AiScreeningResult;
  error?: string;
}

export interface InterviewQuestion {
  category: string;
  question: string;
  keyPoints: string[];
  difficulty: "基础" | "中等" | "进阶";
  followUp?: string;
}

export interface InterviewQuestionResult {
  questions: InterviewQuestion[];
  summary: string;
}
