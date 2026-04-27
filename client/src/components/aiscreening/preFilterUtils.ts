/** 预筛选配置 */
export type PreFilterConfig = {
  /** 关键词，逗号/空格/换行分隔 */
  keywords: string;
  /** 关键词匹配模式 */
  keywordMode: "and" | "or";
  /** 最低匹配分（0-100），空表示不限制 */
  minScore: number | null;
  /** 导入时间起，YYYY-MM-DD */
  dateFrom: string;
  /** 导入时间止 */
  dateTo: string;
};

const DEFAULT_PRE_FILTER: PreFilterConfig = {
  keywords: "",
  keywordMode: "or",
  minScore: null,
  dateFrom: "",
  dateTo: "",
};

export function getDefaultPreFilter(): PreFilterConfig {
  return { ...DEFAULT_PRE_FILTER };
}

export function isEmptyPreFilter(cfg: PreFilterConfig): boolean {
  return (
    !cfg.keywords.trim() &&
    cfg.minScore == null &&
    !cfg.dateFrom.trim() &&
    !cfg.dateTo.trim()
  );
}
