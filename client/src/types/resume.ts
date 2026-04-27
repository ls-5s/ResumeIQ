import type { AiDimensionScores } from "./ai";

// 简历类型
export interface Resume {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  resumeFile: string | null;
  originalFileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  summary: string | null;
  parsedContent: string | null;
  score: number | null; // AI 筛选评分 (0-100)，来自后端
  /** 后端存 JSON 字符串；前端加载后可能规范为对象 */
  dimensionScores?: AiDimensionScores | string | null;
  status: 'pending' | 'rejected' | 'passed';
  createdAt: string;
}

// 上传简历参数
export interface UploadResumeParams {
  file: File;
  name?: string;
  email?: string;
  phone?: string;
}

// 从邮箱导入简历参数
export interface ImportFromEmailParams {
  configId: number;
  since?: string; // ISO 日期字符串
  limit?: number;
}

// 从邮箱导入简历结果
export interface ImportFromEmailResult {
  imported: number;
  resumes: Resume[];
}