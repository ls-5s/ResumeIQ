import type { AiDimensionScores } from "../../types/ai";

/** 与模型分项字段一一对应，文案面向「简历上的关键板块」 */
const RADAR_ORDER: { key: keyof AiDimensionScores; label: string }[] = [
  { key: "skills", label: "专业技能" },
  { key: "projects", label: "项目经验" },
  { key: "experience", label: "工作经历" },
  { key: "education", label: "教育背景" },
  { key: "fit", label: "岗位匹配" },
  { key: "communication", label: "沟通协作" },
  { key: "campus", label: "在校经历" },
];

function clampPercent(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function isCompleteDimensions(o: Record<string, unknown>): boolean {
  const merged =
    o.campus == null && typeof o.stability === "number" && !Number.isNaN(o.stability)
      ? { ...o, campus: o.stability }
      : o;
  return RADAR_ORDER.every(({ key }) => {
    const v = merged[key];
    return typeof v === "number" && !Number.isNaN(v);
  });
}

/** 解析接口/库表中的 dimensionScores（对象或 JSON 字符串） */
export function parseStoredDimensionScores(
  raw: unknown,
): AiDimensionScores | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "string") {
    try {
      const o = JSON.parse(raw) as unknown;
      return parseStoredDimensionScores(o);
    } catch {
      return undefined;
    }
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const rawO = raw as Record<string, unknown>;
  const o =
    rawO.campus == null && typeof rawO.stability === "number" && !Number.isNaN(rawO.stability)
      ? { ...rawO, campus: rawO.stability }
      : rawO;
  if (!isCompleteDimensions(o)) return undefined;
  return {
    skills: clampPercent(Number(o.skills)),
    projects: clampPercent(Number(o.projects)),
    experience: clampPercent(Number(o.experience)),
    education: clampPercent(Number(o.education)),
    fit: clampPercent(Number(o.fit)),
    communication: clampPercent(Number(o.communication)),
    campus: clampPercent(Number(o.campus)),
  };
}

export type MatchRadarRow = { dimension: string; value: number };

/** 模型或库表中的真实分项 → 雷达数据 */
export function radarRowsFromDimensions(d: AiDimensionScores): MatchRadarRow[] {
  return RADAR_ORDER.map(({ key, label }) => ({
    dimension: label,
    value: clampPercent(d[key]),
  }));
}

/** 无分项时的兜底（与综合分相关的示意分布） */
export function buildFallbackRadarRows(overallScore: number): MatchRadarRow[] {
  const s = Math.min(100, Math.max(0, overallScore));
  return [
    { dimension: "专业技能", value: clampPercent(s + 6) },
    { dimension: "项目经验", value: clampPercent(s - 2) },
    { dimension: "工作经历", value: clampPercent(s - 5) },
    { dimension: "教育背景", value: clampPercent(s - 18) },
    { dimension: "岗位匹配", value: clampPercent(s + 3) },
    { dimension: "沟通协作", value: clampPercent(s - 10) },
    { dimension: "在校经历", value: clampPercent(s - 7) },
  ];
}
