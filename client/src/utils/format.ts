/**
 * 解析后端返回的时间字符串（兼容 ISO 8601、SQLite `YYYY-MM-DD HH:MM:SS`、以及误写入的字面量）
 */
export function parseServerDate(
  value: string | number | Date | null | undefined,
): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(value).trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (s === "CURRENT_TIMESTAMP" || lower === "current_timestamp") {
    return null;
  }
  const direct = new Date(s);
  if (!Number.isNaN(direct.getTime())) return direct;
  // SQLite datetime：空格分隔时多数浏览器无法可靠解析，改为 ISO 本地形式再试
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
    const isoLocal = s.replace(" ", "T");
    const asLocal = new Date(isoLocal);
    if (!Number.isNaN(asLocal.getTime())) return asLocal;
    const asUtc = new Date(`${isoLocal}Z`);
    if (!Number.isNaN(asUtc.getTime())) return asUtc;
  }
  return null;
}

export function serverDateToMs(value: string | null | undefined): number {
  return parseServerDate(value)?.getTime() ?? 0;
}

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return "-";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

/**
 * 格式化日期（精确到分钟）
 */
export const formatDate = (dateStr: string | null | undefined): string => {
  const d = parseServerDate(dateStr);
  if (!d) return "—";
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** 列表/详情用短格式（含秒），与 AI 筛选页一致 */
export const formatDateShort = (dateStr: string | null | undefined): string => {
  const d = parseServerDate(dateStr);
  if (!d) return "—";
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

/**
 * 格式化相对时间（如：刚刚、X分钟前、X小时前、X天前）
 */
export const formatRelativeTime = (dateString: string | null | undefined): string => {
  const date = parseServerDate(dateString);
  if (!date) return "—";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (!Number.isFinite(diff)) return "—";
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString("zh-CN");
};
