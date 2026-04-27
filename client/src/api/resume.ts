import instance from "../utils/http";
import type { Resume, UploadResumeParams, ImportFromEmailParams, ImportFromEmailResult } from "../types/resume";

/**
 * 从邮箱导入简历
 */
export const importResumesFromEmail = async (params: ImportFromEmailParams): Promise<ImportFromEmailResult> => {
  return instance.post("/v1/resume/import-from-email", params);
};

/**
 * 上传简历
 */
export const uploadResume = async (params: UploadResumeParams): Promise<Resume> => {
  const formData = new FormData();
  formData.append('file', params.file);
  if (params.name) formData.append('name', params.name);
  if (params.email) formData.append('email', params.email);
  if (params.phone) formData.append('phone', params.phone);

  return instance.post("/v1/resume/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export interface ResumeFilterParams {
  keywords?: string;
  keywordMode?: "and" | "or";
  minScore?: number | null;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * 获取简历列表（支持预筛选）
 */
export const getFilteredResumes = async (
  filters?: ResumeFilterParams,
): Promise<Resume[]> => {
  const params = new URLSearchParams();
  if (filters?.keywords?.trim()) {
    params.set("keywords", filters.keywords);
    if (filters.keywordMode) params.set("keywordMode", filters.keywordMode);
  }
  if (filters?.minScore != null) {
    params.set("minScore", String(filters.minScore));
  }
  if (filters?.dateFrom?.trim()) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo?.trim()) params.set("dateTo", filters.dateTo);

  const qs = params.toString();
  const url = qs ? `/v1/resumes?${qs}` : "/v1/resumes";
  return instance.get(url);
};

/**
 * 获取简历列表
 */
export const getResumes = async (): Promise<Resume[]> => {
  return instance.get("/v1/resumes");
};

/**
 * 获取简历详情
 */
export const getResume = async (id: number): Promise<Resume> => {
  return instance.get(`/v1/resume/${id}`);
};

/**
 * 删除简历
 */
export const deleteResume = async (id: number): Promise<void> => {
  return instance.delete(`/v1/resume/${id}`);
};

/**
 * 更新简历状态
 */
export const updateResumeStatus = async (id: number, status: 'pending' | 'passed' | 'rejected'): Promise<Resume> => {
  return instance.put(`/v1/resume/${id}/status`, { status });
};

/**
 * 批量更新简历状态
 */
export const batchUpdateResumeStatus = async (ids: number[], status: 'pending' | 'passed' | 'rejected'): Promise<void> => {
  return instance.post("/v1/resume/batch-status", { ids, status });
};