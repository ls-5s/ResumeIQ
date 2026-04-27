import instance from "../utils/http";
import type { PreFilterConfig } from "../components/aiscreening/preFilterUtils";
import type {
  ScreeningTemplate,
  RawTemplateRow,
  ScreeningTemplatePatch,
} from "../types/screening-template";

export type { ScreeningTemplate } from "../types/screening-template";

const DEFAULT_CONFIG: PreFilterConfig = {
  keywords: "",
  keywordMode: "or",
  minScore: null,
  dateFrom: "",
  dateTo: "",
};

function normalize(raw: RawTemplateRow): ScreeningTemplate {
  let config: PreFilterConfig;
  if (typeof raw.config === "string") {
    try {
      config = JSON.parse(raw.config) as PreFilterConfig;
    } catch {
      config = { ...DEFAULT_CONFIG };
    }
  } else {
    config = (raw.config as PreFilterConfig | undefined) ?? { ...DEFAULT_CONFIG };
  }
  return {
    id: raw.id,
    userId: raw.userId,
    name: raw.name,
    config,
    isDefault: !!raw.isDefault,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/**
 * 获取筛选模板列表
 */
export const loadTemplates = async (): Promise<ScreeningTemplate[]> => {
  const list = await instance.get("/v1/screening-templates");
  if (!Array.isArray(list)) return [];
  return (list as RawTemplateRow[]).map(normalize);
};

/**
 * 获取筛选模板详情
 */
export const getTemplate = async (id: number): Promise<ScreeningTemplate> => {
  const row = (await instance.get(`/v1/screening-templates/${id}`)) as RawTemplateRow;
  return normalize(row);
};

/**
 * 创建筛选模板
 */
export const createTemplate = async (
  name: string,
  config: PreFilterConfig,
): Promise<ScreeningTemplate> => {
  const patch: ScreeningTemplatePatch = { name, config };
  const row = (await instance.post("/v1/screening-templates", patch)) as RawTemplateRow;
  return normalize(row);
};

/**
 * 更新筛选模板
 */
export const updateTemplate = async (
  id: number,
  patch: ScreeningTemplatePatch,
): Promise<ScreeningTemplate> => {
  const row = (await instance.put(`/v1/screening-templates/${id}`, patch)) as RawTemplateRow;
  return normalize(row);
};

/**
 * 删除筛选模板
 */
export const deleteTemplate = async (id: number): Promise<void> => {
  return instance.delete(`/v1/screening-templates/${id}`);
};

/**
 * 复制筛选模板
 */
export const duplicateTemplate = async (id: number, newName: string): Promise<ScreeningTemplate> => {
  const row = (await instance.post(`/v1/screening-templates/${id}/duplicate`, {
    name: newName,
  })) as RawTemplateRow;
  return normalize(row);
};

/**
 * 设为默认筛选模板
 */
export const setDefaultTemplate = async (id: number): Promise<void> => {
  return instance.post(`/v1/screening-templates/${id}/set-default`);
};
