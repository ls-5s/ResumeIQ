import { db } from "../../db/index";
import { aiConfigs, resumes } from "../../db/schema";
import type { AiConfig } from "../../db/schema";
import { eq, and, inArray, or } from "drizzle-orm";
import { encrypt, decrypt, mask } from "../../utils/crypto";
import { getUserVisibleTeamIds } from "../team/team.js";

// 将 apiKey 脱敏后返回，防止泄露到前端
function sanitizeAiConfig(config: AiConfig): Omit<AiConfig, "apiKey"> & { apiKey: string } {
  return { ...config, apiKey: "" };
}

/**
 * 测试 AI 配置是否有效
 */
export async function testAiConfig(config: {
  model: string;
  apiUrl: string;
  apiKey: string;
  task?: string;
}): Promise<{ success: boolean; message: string }> {
  const { model, apiUrl, apiKey, task } = config;
  const url = apiUrl.replace(/\/$/, "");

  // 识别 API 类型
  const apiType = detectApiType(url);

  // 构建请求体
  const requestBody = buildRequestBody(apiType, model, task);

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      },
      10000,
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Record<
        string,
        any
      >;
      const message = parseApiError(response.status, errorData, apiType);
      return { success: false, message };
    }

    const data = (await response.json()) as Record<string, any>;
    const hasContent =
      data.choices?.length > 0 || data.output?.choices?.length > 0;

    return hasContent
      ? { success: true, message: "AI 模型连接成功" }
      : { success: false, message: "API 响应格式异常" };
  } catch (error) {
    return handleRequestError(error);
  }
}

/**
 * 识别 API 类型
 */
function detectApiType(
  url: string,
): "aliyun-native" | "aliyun-compatible" | "other" {
  const isAliyun = url.includes("dashscope.aliyuncs.com");
  if (!isAliyun) return "other";

  // 兼容模式 API (类似 OpenAI 格式)
  if (url.includes("/compatible-mode/")) {
    return "aliyun-compatible";
  }
  // 原生 API
  return "aliyun-native";
}

/**
 * 根据 API 类型构建请求体
 */
function buildRequestBody(
  apiType: string,
  model: string,
  task?: string,
): Record<string, unknown> {
  const basePayload = { model, max_tokens: 4000 };

  switch (apiType) {
    case "aliyun-native":
      // 阿里云原生 API，需要 task 参数
      return {
        ...basePayload,
        task: task || "text-generation",
        input: {
          messages: [{ role: "user", content: "Hi" }],
        },
        parameters: { result_format: "message" },
      };
    case "aliyun-compatible":
      // 阿里云兼容 API（类似 OpenAI 格式），使用顶层 messages
      const payload: Record<string, unknown> = {
        ...basePayload,
        messages: [{ role: "user", content: "Hi" }],
      };
      // 只有明确传入了 task 才添加
      if (task) {
        payload.task = task;
      }
      return payload;
    default:
      // OpenAI 兼容 API，不需要 task 参数
      return {
        ...basePayload,
        messages: [{ role: "user", content: "Hi" }],
      };
  }
}

/**
 * 带超时的 fetch 封装
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 解析 API 错误响应
 */
function parseApiError(
  status: number,
  data: Record<string, unknown>,
  apiType: string,
): string {
  // 优先使用 API 返回的错误信息
  const errorObj = data.error as Record<string, unknown> | undefined;
  const apiMessage =
    (data.message as string) ||
    (errorObj?.message as string) ||
    (typeof data.detail === "string" ? data.detail : undefined);

  if (apiMessage) return apiMessage;

  // HTTP 状态码错误
  const isAliyun = apiType !== "other";

  const errorMessages: Record<number, string> = {
    400: isAliyun ? "请求参数错误，请检查模型名称和请求格式" : "请求参数错误",
    401: "API Key 无效或过期",
    403: isAliyun ? "API Key 无权限或免费额度耗尽" : "无权访问",
    404: isAliyun ? "API 地址错误，请检查 URL" : "接口地址错误",
    429: "请求频率超限，请稍后再试",
    500: "AI 服务端错误，请稍后再试",
    502: "AI 服务端错误，请稍后再试",
    503: "AI 服务端错误，请稍后再试",
  };

  return errorMessages[status] || `API 返回错误: ${status}`;
}

/**
 * 处理请求异常
 */
function handleRequestError(error: unknown): {
  success: boolean;
  message: string;
} {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return { success: false, message: "请求超时，请检查网络或 API 地址" };
    }
    return { success: false, message: `连接失败：${error.message}` };
  }
  return { success: false, message: "连接失败，请检查 API 地址和 Key" };
}
/**
 * 获取用户的 AI 配置列表
 */
export async function getAiConfigs(userId: number) {
  const configs = await db
    .select()
    .from(aiConfigs)
    .where(eq(aiConfigs.userId, userId));

  return configs.map(sanitizeAiConfig);
}

/**
 * 获取单个 AI 配置
 */
export async function getAiConfigById(userId: number, configId: number) {
  const [config] = await db
    .select()
    .from(aiConfigs)
    .where(eq(aiConfigs.id, configId));

  if (!config || config.userId !== userId) {
    return null;
  }

  return config;
}

/**
 * 获取默认 AI 配置（返回第一个或新建默认配置）
 */
export async function getAiConfig(userId: number) {
  const configs = await db
    .select()
    .from(aiConfigs)
    .where(eq(aiConfigs.userId, userId));

  if (configs.length === 0) {
    // 如果没有配置，返回默认配置
    return {
      id: null,
      userId,
      name: "默认配置",
      model: "gpt-4o",
      apiUrl: "https://api.openai.com/v1",
      apiKey: "",
      prompt:
        "你是一个专业的简历筛选助手。请根据以下简历内容，评估候选人是否符合岗位要求。\n\n岗位要求：\n{job_requirements}\n\n简历内容：\n{resume_content}\n\n请从以下几个方面进行评估：\n1. 教育背景\n2. 工作经历\n3. 技能匹配度\n4. 项目经验\n\n请给出评估结果和建议。",
      isDefault: true,
    };
  }

  // 返回默认配置，如果没有设置默认则返回第一个（均脱敏后返回）
  const defaultConfig = configs.find((c) => c.isDefault);
  const found = defaultConfig || configs[0];
  return found ? sanitizeAiConfig(found) : null;
}

/**
 * 创建 AI 配置
 */
export async function createAiConfig(
  userId: number,
  data: {
    name?: string;
    model?: string;
    apiUrl?: string;
    apiKey?: string;
    prompt?: string;
    isDefault?: boolean;
  },
) {
  // 如果设置为默认配置，先取消其他默认配置
  if (data.isDefault === true) {
    await db
      .update(aiConfigs)
      .set({ isDefault: 0 })
      .where(eq(aiConfigs.userId, userId));
  }

  const [created] = await db
    .insert(aiConfigs)
    .values({
      userId,
      name: data.name || "新配置",
      model: data.model || "gpt-4o",
      apiUrl: data.apiUrl || "https://api.openai.com/v1",
      apiKey: encrypt(data.apiKey || ""),
      prompt: data.prompt || "",
      isDefault: data.isDefault ? 1 : 0,
    })
    .returning();

  return sanitizeAiConfig(created);
}
export async function updateAiConfig(
  userId: number,
  configId: number,
  data: {
    name?: string;
    model?: string;
    apiUrl?: string;
  },
) {
  // 验证配置属于该用户
  const [existing] = await db
    .select()
    .from(aiConfigs)
    .where(eq(aiConfigs.id, configId));

  if (!existing || existing.userId !== userId) {
    return null;
  }

  await db
    .update(aiConfigs)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.model !== undefined && { model: data.model }),
      ...(data.apiUrl !== undefined && { apiUrl: data.apiUrl }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(aiConfigs.id, configId));

  // 手动查询返回更新后的记录
  const [updated] = await db
    .select()
    .from(aiConfigs)
    .where(eq(aiConfigs.id, configId));

  return updated;
}

/**
 * 更新 AI 配置（包括敏感信息）
 */
export async function updateAiConfigFull(
  userId: number,
  configId: number,
  data: {
    name?: string;
    model?: string;
    apiUrl?: string;
    apiKey?: string;
    prompt?: string;
    isDefault?: boolean;
  },
) {
  // 验证配置属于该用户
  const [existing] = await db
    .select()
    .from(aiConfigs)
    .where(eq(aiConfigs.id, configId));

  if (!existing || existing.userId !== userId) {
    return null;
  }

  // 如果设置为默认配置，先取消其他默认配置
  if (data.isDefault === true) {
    await db
      .update(aiConfigs)
      .set({ isDefault: 0 })
      .where(eq(aiConfigs.userId, userId));
  }

  // 只有非空字符串才覆盖已存储的 Key，避免空字符串误覆盖；写入前加密
  const setData: Record<string, unknown> = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.model !== undefined && { model: data.model }),
    ...(data.apiUrl !== undefined && { apiUrl: data.apiUrl }),
    ...(data.prompt !== undefined && { prompt: data.prompt }),
    ...(data.isDefault !== undefined && { isDefault: data.isDefault ? 1 : 0 }),
    updatedAt: new Date().toISOString(),
  };
  if (typeof data.apiKey === "string" && data.apiKey !== "") {
    setData.apiKey = encrypt(data.apiKey);
  }

  await db
    .update(aiConfigs)
    .set(setData)
    .where(eq(aiConfigs.id, configId));

  // 手动查询返回更新后的记录（脱敏后）
  const [updated] = await db
    .select()
    .from(aiConfigs)
    .where(eq(aiConfigs.id, configId));

  return sanitizeAiConfig(updated);
}

/**
 * 删除 AI 配置
 */
export async function deleteAiConfig(userId: number, configId: number) {
  // 验证配置属于该用户
  const [existing] = await db
    .select()
    .from(aiConfigs)
    .where(eq(aiConfigs.id, configId));

  if (!existing || existing.userId !== userId) {
    return false;
  }

  await db.delete(aiConfigs).where(eq(aiConfigs.id, configId));

  return true;
}

/**
 * 使用 AI 筛选简历
 */
const DIMENSION_KEYS = [
  "skills",
  "projects",
  "experience",
  "education",
  "fit",
  "communication",
  "campus",
] as const;

type AiDimensionScores = Record<(typeof DIMENSION_KEYS)[number], number>;

function clampScore0to100(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * 分项仅采纳模型给出的数值，每项独立为 0–100 的整数百分比；
 * 任一项缺失则不返回分项（避免用综合分「抹平」各轴）。
 */
function normalizeDimensions(raw: unknown): AiDimensionScores | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = { ...(raw as Record<string, unknown>) };
  // 旧版 JSON 分项字段 stability → campus
  if (
    o.campus == null &&
    typeof o.stability === "number" &&
    !Number.isNaN(o.stability)
  ) {
    o.campus = o.stability;
  }
  const filled = {} as AiDimensionScores;
  for (const k of DIMENSION_KEYS) {
    const v = o[k];
    if (typeof v !== "number" || Number.isNaN(v)) {
      return undefined;
    }
    filled[k] = clampScore0to100(v);
  }
  return filled;
}

export async function screenResumeWithAi(
  userId: number,
  resumeId: number,
  jobRequirements: string,
  aiConfigId?: number,
): Promise<{
  success: boolean;
  result?: {
    recommendation: "pass" | "reject" | "pending";
    score: number;
    reasoning: string;
    dimensions?: AiDimensionScores;
  };
  error?: string;
}> {
  // 获取 AI 配置
  let config:
    | Awaited<ReturnType<typeof getAiConfigById>>
    | (Awaited<ReturnType<typeof getAiConfig>> & { apiKey: string });

  if (aiConfigId) {
    const raw = await getAiConfigById(userId, aiConfigId);
    if (!raw) {
      return { success: false, error: "AI 配置不存在" };
    }
    // 解密 apiKey
    config = raw;
    config.apiKey = (raw.apiKey != null && raw.apiKey !== "") ? decrypt(raw.apiKey) : "";
  } else {
    const found = await getAiConfig(userId);
    if (!found) {
      return { success: false, error: "请先配置 AI API Key" };
    }
    // getAiConfig 已脱敏；手动取原始记录并解密，以供内部使用
    const raw = await getAiConfigById(userId, found.id!);
    config = raw ?? found;
    config.apiKey = (raw?.apiKey != null && raw.apiKey !== "") ? decrypt(raw.apiKey) : "";
  }

  // 实际请求时使用解密后的明文（注意：已在上方解密过，避免重复解密）
  const apiKey = config.apiKey ?? "";

  if (!apiKey) {
    return { success: false, error: "请先配置 AI API Key" };
  }

  // 获取简历内容（支持团队可见）
  // 获取用户可见的团队 ID
  const teamIds = await getUserVisibleTeamIds(userId);

  // 可见条件：自己上传的 OR 属于团队的
  const visibleCondition = or(
    eq(resumes.userId, userId),
    teamIds.length > 0 ? inArray(resumes.teamId, teamIds) : undefined,
  );

  const [resume] = await db
    .select()
    .from(resumes)
    .where(
      and(
        eq(resumes.id, resumeId),
        visibleCondition,
      ),
    );
  if (!resume) {
    return { success: false, error: "简历不存在" };
  }
  // 提示词模板中的占位符替换为实际内容，便于模型与用户自定义说明一致
  const promptTemplate = (config.prompt || "").trim();
  const resolvedPrompt = promptTemplate
    .replace(/\{job_requirements\}/g, jobRequirements)
    .replace(/\{resume_content\}/g, resume.parsedContent || "");

  const prompt = `你是招聘筛选助手。请**严格依据**下面「岗位要求」和「筛选标准」评估候选人。

岗位要求：
${jobRequirements}

筛选标准（你的评估维度与侧重点）：
${resolvedPrompt || "(无额外筛选标准，请主要依据岗位要求评估)"}

候选人简历内容：
${resume.parsedContent}

请用以下 Markdown 格式输出（不要用 JSON，不要用代码块包裹）：

推荐：pass|reject|pending（必填，只填这三个词之一）
综合分：XX（0-100 整数，表示整体匹配度）
维度评分：（以下每项均为 0–100 的整数百分比，**相互独立**按简历与岗位在该维度的匹配程度分别打分，勿全部与综合分相同）
- 专业技能：XX
- 项目经验：XX
- 工作经历：XX
- 教育背景：XX
- 岗位匹配：XX
- 沟通协作：XX
- 在校经历：XX

## 评估理由
[详细说明该候选人与岗位的匹配情况，包括优势、不足和推荐理由]`;
  // 调用 AI API
  const url = config.apiUrl.replace(/\/$/, "");
  const apiType = detectApiType(config.apiUrl);

  // 根据 API 类型构建请求体
  const requestBody = buildRequestBody(
    apiType,
    config.model,
    "text-generation",
  );
  //替换 messages 内容 为实际的 prompt
  if ("messages" in requestBody) {
    (requestBody as any).messages = [{ role: "user", content: prompt }];
  } else if ("input" in requestBody) {
    (requestBody as any).input = {
      messages: [{ role: "user", content: prompt }],
    };
  }

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      },
      600000,
    );
    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Record<
        string,
        any
      >;
      const message = parseApiError(response.status, errorData, apiType);
      return { success: false, error: message };
    }

    const data = (await response.json()) as Record<string, any>;

    // 根据 API 类型解析响应
    let aiResponse = "";
    if (apiType === "aliyun-native") {
      // 阿里云原生 API 响应格式
      aiResponse = data.output?.choices?.[0]?.message?.content || "";
    } else {
      // OpenAI 兼容格式 (包括阿里云兼容模式)
      aiResponse = data.choices?.[0]?.message?.content || "";
    }

    // 解析 AI 响应，提取评估结果
    const result = parseAiResponse(aiResponse);

    const status =
      result.recommendation === "pass"
        ? "passed"
        : result.recommendation === "reject"
          ? "rejected"
          : "pending";

    await db
      .update(resumes)
      .set({
        summary: result.reasoning,
        score: result.score,
        status,
        dimensionScores: result.dimensions
          ? JSON.stringify(result.dimensions)
          : null,
      })
      .where(
        and(
          eq(resumes.id, resumeId),
          visibleCondition,
        ),
      );

    const [updatedResume] = await db
      .select({
        id: resumes.id,
        summary: resumes.summary,
        status: resumes.status,
      })
      .from(resumes)
      .where(
        and(
          eq(resumes.id, resumeId),
          visibleCondition,
        ),
      );

    if (!updatedResume || !updatedResume.summary) {
      return {
        success: false,
        error: "AI 评价写入数据库失败，请检查简历归属与数据库连接",
      };
    }

    return {
      success: true,
      result,
    };
  } catch (error) {
    return handleRequestError(error);
  }
}

/**
 * 解析 AI 响应，提取评估结果
 */
function parseAiResponse(aiResponse: string): {
  recommendation: "pass" | "reject" | "pending";
  score: number;
  reasoning: string;
  dimensions?: AiDimensionScores;
} {
  const raw = (aiResponse || "").trim();

  // 优先解析 Markdown 格式
  const mdResult = parseMarkdownResponse(raw);
  if (mdResult) return mdResult;

  // 兜底解析 JSON
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        recommendation?: "pass" | "reject" | "pending";
        score?: number;
        reasoning?: string;
        dimensions?: unknown;
      };

      const recommendation =
        parsed.recommendation === "pass" ||
        parsed.recommendation === "reject" ||
        parsed.recommendation === "pending"
          ? parsed.recommendation
          : "pending";

      const score =
        typeof parsed.score === "number"
          ? Math.min(100, Math.max(0, Math.round(parsed.score)))
          : 50;

      const dimensions = normalizeDimensions(parsed.dimensions);

      return {
        recommendation,
        score,
        reasoning:
          typeof parsed.reasoning === "string" ? parsed.reasoning : raw,
        ...(dimensions ? { dimensions } : {}),
      };
    } catch {
      // 忽略
    }
  }

  // 最后的兜底：关键词匹配
  const lowerResponse = raw.toLowerCase();
  let recommendation: "pass" | "reject" | "pending" = "pending";
  if (
    lowerResponse.includes("不推荐") ||
    lowerResponse.includes("拒绝") ||
    lowerResponse.includes("不合适") ||
    lowerResponse.includes("不符合") ||
    lowerResponse.includes("不通过")
  ) {
    recommendation = "reject";
  } else if (
    lowerResponse.includes("推荐") ||
    lowerResponse.includes("通过") ||
    lowerResponse.includes("合适") ||
    lowerResponse.includes("符合")
  ) {
    recommendation = "pass";
  }

  let score = 50;
  const scoreMatch =
    raw.match(/(\d{1,3})\s*分/) ||
    raw.match(/score\s*[:：]\s*(\d{1,3})/i) ||
    raw.match(/评分\s*[:：]\s*(\d{1,3})/);
  if (scoreMatch) {
    score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
  }

  return { recommendation, score, reasoning: raw };
}

/**
 * 解析 Markdown 格式的 AI 响应
 */
function parseMarkdownResponse(raw: string): {
  recommendation: "pass" | "reject" | "pending";
  score: number;
  reasoning: string;
  dimensions?: AiDimensionScores;
} | null {
  const recMatch = raw.match(/推荐[：:]\s*(pass|reject|pending)/i);
  if (!recMatch) return null;

  const recommendation = recMatch[1].toLowerCase() as
    | "pass"
    | "reject"
    | "pending";

  const scoreMatch = raw.match(/综合[分评分][：:]\s*(\d+)/);
  if (!scoreMatch) return null;

  const score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));

  const dimPatterns: Array<[string, keyof AiDimensionScores][]> = [
    [["专业技能", "skills"]],
    [["项目经验", "projects"]],
    [["工作经历", "experience"]],
    [["教育背景", "education"]],
    [["岗位匹配", "fit"]],
    [["沟通协作", "communication"]],
    // 新标签 + 旧模型仍可能输出「履历稳定」
    [
      ["在校经历", "campus"],
      ["履历稳定", "campus"],
    ],
  ];

  const dimensions: Partial<AiDimensionScores> = {};
  for (const alternatives of dimPatterns) {
    for (const [label, key] of alternatives) {
      const m = raw.match(new RegExp(`${label}[：:]\\s*(\\d{1,3})`, "i"));
      if (m) {
        dimensions[key] = Math.min(100, Math.max(0, parseInt(m[1]))) as never;
        break;
      }
    }
  }

  // 提取评估理由：Markdown 中 "## 评估理由" 之后的内容
  const reasoningMatch = raw.match(/##\s*评估理由\n([\s\S]*)$/i);
  const reasoning = reasoningMatch
    ? reasoningMatch[1].trim()
    : raw
        .replace(/^推荐[：:].*/m, "")
        .replace(/^综合[分评分][：:].*/m, "")
        .replace(/^维度评分\n/, "")
        .replace(/^[-*]\s*.+\n?/gm, "")
        .trim();

  const normalized = normalizeDimensions(dimensions);

  return {
    recommendation,
    score,
    reasoning,
    ...(normalized ? { dimensions: normalized } : {}),
  };
}

/**
 * 批量使用 AI 筛选简历
 */
export async function batchScreenResumesWithAi(
  userId: number,
  resumeIds: number[],
  jobRequirements: string,
  aiConfigId?: number,
): Promise<{
  success: boolean;
  results?: Array<{
    resumeId: number;
    success: boolean;
    result?: {
      recommendation: "pass" | "reject" | "pending";
      score: number;
      reasoning: string;
      dimensions?: AiDimensionScores;
    };
    error?: string;
  }>;
  error?: string;
}> {
  const results = [];

  for (const resumeId of resumeIds) {
    const result = await screenResumeWithAi(
      userId,
      resumeId,
      jobRequirements,
      aiConfigId,
    );
    results.push({
      resumeId,
      ...result,
    });
  }

  return {
    success: true,
    results,
  };
}

// ==================== 面试题生成 ====================

export interface InterviewQuestion {
  category: string;
  question: string;
  keyPoints: string[];
  difficulty: "基础" | "中等" | "进阶";
  followUp?: string;
}

export interface GenerateInterviewQuestionsResult {
  success: boolean;
  result?: {
    questions: InterviewQuestion[];
    summary: string;
  };
  error?: string;
}

/**
 * 使用 AI 生成面试题
 */
export async function generateInterviewQuestions(
  userId: number,
  resumeId: number,
  customFocus?: string,
  aiConfigId?: number,
  questionCount?: number,
): Promise<GenerateInterviewQuestionsResult> {
  // 获取 AI 配置
  let config:
    | Awaited<ReturnType<typeof getAiConfigById>>
    | (Awaited<ReturnType<typeof getAiConfig>> & { apiKey: string });

  if (aiConfigId) {
    const raw = await getAiConfigById(userId, aiConfigId);
    if (!raw) {
      return { success: false, error: "AI 配置不存在" };
    }
    config = raw;
    config.apiKey = (raw.apiKey != null && raw.apiKey !== "") ? decrypt(raw.apiKey) : "";
  } else {
    const found = await getAiConfig(userId);
    if (!found) {
      return { success: false, error: "请先配置 AI API Key" };
    }
    const raw = await getAiConfigById(userId, found.id!);
    config = raw ?? found;
    config.apiKey = (raw?.apiKey != null && raw.apiKey !== "") ? decrypt(raw.apiKey) : "";
  }

  const apiKey = config.apiKey ?? "";
  if (!apiKey) {
    return { success: false, error: "请先配置 AI API Key" };
  }

  // 获取简历内容（支持团队可见）
  const teamIds = await getUserVisibleTeamIds(userId);
  const visibleCondition = or(
    eq(resumes.userId, userId),
    teamIds.length > 0 ? inArray(resumes.teamId, teamIds) : undefined,
  );

  const [resume] = await db
    .select()
    .from(resumes)
    .where(
      and(
        eq(resumes.id, resumeId),
        visibleCondition,
      ),
    );

  if (!resume) {
    return { success: false, error: "简历不存在" };
  }

  // 构建面试题生成提示词
  const count = questionCount && questionCount > 0 ? questionCount : 5;
  const customFocusSection = customFocus?.trim()
    ? `\n\n面试官重点关注方向（请加强对以下内容的考察）：\n${customFocus.trim()}`
    : "";

  const prompt = `你是资深技术面试官。请根据以下简历内容，生成针对性的面试题。

  简历内容：
  ${resume.parsedContent || ""}
  ${customFocusSection}
  
  生成至少 ${count} 道面试题，覆盖以下方面（尽量每类都出题）：
  1. 项目经历深挖（考察简历中提到的项目，从背景、职责、技术细节、难点、成果等角度切入）
  2. 技术知识点（根据项目使用的技术栈，深挖原理和实践）
  3. 候选人的薄弱环节或需要验证的能力（追问验证）
  
  请严格按以下格式输出（使用特殊分隔符分隔每道题）：
  
  # 面试题

## 题目1
  - **类别**：项目经历深挖 / 技术知识点 / 追问验证 / 行为面试
  - **问题**：面试题正文
  - **考察要点**：要点1、要点2、要点3...
  - **难度**：基础 / 中等 / 进阶
  - **追问方向**：如果候选人回答较好，可以追问的方向（若无则写“无”）
  
## 题目2
  - **类别**：...
  - **问题**：...
  - **考察要点**：...
  - **追问方向**：...
  
  （依次列出至少${count}道题，可继续增加题目3、4、5...）
  
  注意：
  - 不要输出任何 JSON 结构或代码块。
  - 不要输出难度等级
  - 必须先输出"## 面试考察重点"作为独立段落，总结本次面试的考察重点（2-3句话）
  - 然后再输出"# 面试题"和具体题目列表
- 每个题目必须包含类别、问题、考察要点、追问方向
  - “考察要点”用逗号或顿号分隔即可。
  - 确保生成内容专业、针对简历、有深度`;

  // 调用 AI API
  const url = config.apiUrl.replace(/\/$/, "");
  const apiType = detectApiType(config.apiUrl);
  const requestBody = buildRequestBody(apiType, config.model, "text-generation");

  if ("messages" in requestBody) {
    (requestBody as any).messages = [{ role: "user", content: prompt }];
  } else if ("input" in requestBody) {
    (requestBody as any).input = {
      messages: [{ role: "user", content: prompt }],
    };
  }

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      },
      600000,
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Record<string, any>;
      const message = parseApiError(response.status, errorData, apiType);
      return { success: false, error: message };
    }

    const data = (await response.json()) as Record<string, any>;
    console.log("文字",data);
    let aiResponse = "";
    if (apiType === "aliyun-native") {
      aiResponse = data.output?.choices?.[0]?.message?.content || "";
    } else {
      aiResponse = data.choices?.[0]?.message?.content || "";
    }

    // 解析 AI 响应
    const result = parseInterviewQuestionsResponse(aiResponse);

    return {
      success: true,
      result,
    };
  } catch (error) {
    return handleRequestError(error);
  }
}

/**
 * 解析面试题响应：依次尝试 JSON → Markdown → 原始文本兜底
 */
function parseInterviewQuestionsResponse(aiResponse: string): {
  questions: InterviewQuestion[];
  summary: string;
} {
  const raw = (aiResponse || "").trim();

  // ── 1. 尝试 JSON 解析 ──────────────────────────────────────────
  const jsonResult = tryParseJson(raw);
  if (jsonResult) return jsonResult;

  // ── 2. 尝试 Markdown 解析 ─────────────────────────────────────
  const mdResult = tryParseMarkdown(raw);
  if (mdResult) return mdResult;

  // ── 3. 兜底：尝试从原始文本中提取 summary ────────────────────
  // 提取 "面试考察重点" 后面的文字
  const summaryFallbackMatch = raw.match(/面试考察重点[：:\s\n]*([\s\S]*?)(?=#{1,3}\s*题目|##\s*面试题|$)/i);
  const summaryFallback = summaryFallbackMatch ? summaryFallbackMatch[1].trim() : raw.slice(0, 200);

  return {
    questions: [],
    summary: summaryFallback,
  };
}

/** 从 AI 响应中提取 JSON（支持去 markdown 代码块包裹） */
function extractJsonFromResponse(raw: string): string | null {
  // 去掉 markdown 代码块包裹
  const withoutFence = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // 策略1：尝试直接解析整个文本
  try {
    const parsed = JSON.parse(withoutFence);
    if (parsed && (parsed.questions || parsed.问题 || parsed.summary || parsed.总结)) {
      return withoutFence;
    }
  } catch {
    // 解析失败，继续尝试其他策略
  }

  // 策略2：从第一个 { 开始，找到完整的 JSON 对象
  const firstBrace = withoutFence.indexOf("{");
  if (firstBrace === -1) return null;

  // 使用栈来匹配括号，正确处理嵌套
  const stack: number[] = [];
  let lastValidPos = -1;

  for (let i = firstBrace; i < withoutFence.length; i++) {
    const char = withoutFence[i];
    const prevChar = i > 0 ? withoutFence[i - 1] : "";

    // 跳过字符串内的括号
    if (char === '"' && prevChar !== "\\") {
      // 在字符串内，跳过直到下一个未转义的引号
      i++;
      while (i < withoutFence.length) {
        const c = withoutFence[i];
        const pc = withoutFence[i - 1];
        if (c === '"' && pc !== "\\") break;
        i++;
      }
      continue;
    }

    if (char === "{") {
      stack.push(i);
    } else if (char === "}") {
      if (stack.length > 0) {
        stack.pop();
        if (stack.length === 0) {
          lastValidPos = i;
          break;
        }
      }
    }
  }

  if (lastValidPos === -1) return null;

  const jsonCandidate = withoutFence.slice(firstBrace, lastValidPos + 1);

  // 验证是否是有效 JSON
  try {
    const parsed = JSON.parse(jsonCandidate);
    if (parsed && (parsed.questions || parsed.问题 || parsed.summary || parsed.总结)) {
      return jsonCandidate;
    }
  } catch {
    // JSON 解析失败，继续尝试
  }

  // 策略3：查找 questions 或 问题 数组，并构建完整 JSON
  const questionsMatch = withoutFence.match(/"questions"\s*:\s*(\[[\s\S]*?\])\s*,?\s*(?=\n|}|$)/i)
    || withoutFence.match(/"问题"\s*:\s*(\[[\s\S]*?\])\s*,?\s*(?=\n|}|$)/i);

  if (questionsMatch) {
    try {
      const questionsArr = JSON.parse(questionsMatch[1]);
      if (Array.isArray(questionsArr) && questionsArr.length > 0) {
        // 尝试找到 summary 或 总结 字段
        const summaryMatch = withoutFence.match(/"summary"\s*:\s*"([^"]*(?:\\(?:\"|n|t|r))*)"/i)
          || withoutFence.match(/"总结"\s*:\s*"([^"]*(?:\\(?:\"|n|t|r))*)"/i);
        const summary = summaryMatch ? summaryMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : "";
        return JSON.stringify({ questions: questionsArr, summary });
      }
    } catch {
      // 解析失败
    }
  }

  return null;
}

function tryParseJson(raw: string): {
  questions: InterviewQuestion[];
  summary: string;
} | null {
  const jsonStr = extractJsonFromResponse(raw);
  if (!jsonStr) return null;

  try {
    const parsed = JSON.parse(jsonStr) as {
      summary?: string;
      总结?: string;
      questions?: unknown[];
      问题?: unknown[];
    };

    // 兼容中文字段名
    const summary =
      (typeof parsed.summary === "string" ? parsed.summary.trim() : "")
      || (typeof parsed.总结 === "string" ? parsed.总结.trim() : "");
    // 兼容中文字段名
    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions
      : Array.isArray(parsed.问题) ? parsed.问题 : [];

    if (rawQuestions.length === 0) return null;

    const questions: InterviewQuestion[] = [];

    for (const item of rawQuestions) {
      if (!item || typeof item !== "object") continue;

      const obj = item as Record<string, unknown>;

      // 兼容中文字段名
      const category =
        (typeof obj.category === "string" ? obj.category.trim() : "")
        || (typeof obj["类型"] === "string" ? (obj["类型"] as string).trim() : "")
        || "面试考察";
      const question =
        (typeof obj.question === "string" ? obj.question.trim() : "")
        || (typeof obj["问题"] === "string" ? (obj["问题"] as string).trim() : "");
      const difficultyRaw = obj.difficulty ?? obj["难度"];
      const difficulty: InterviewQuestion["difficulty"] =
        difficultyRaw === "基础"
          ? "基础"
          : difficultyRaw === "进阶"
            ? "进阶"
            : "中等";

      // 兼容中文字段名
      const keyPointsRaw = obj.keyPoints ?? obj["考察要点"];
      const keyPoints = Array.isArray(keyPointsRaw)
        ? keyPointsRaw
            .map((k) => (typeof k === "string" ? k.trim() : ""))
            .filter(Boolean)
        : [];

      // 兼容中文字段名
      const followUpRaw = obj.followUp ?? obj["追问"];
      const followUp =
        typeof followUpRaw === "string" ? followUpRaw.trim() : undefined;

      if (!question) continue;

      questions.push({ category, question, keyPoints, difficulty, followUp });
    }

    if (questions.length === 0) return null;

    return { questions, summary };
  } catch {
    return null;
  }
}

function tryParseMarkdown(raw: string): {
  questions: InterviewQuestion[];
  summary: string;
} | null {
  // 匹配 "面试考察重点" 或 "## 面试考察重点" 后跟段落后跟 "# 面试题" 的格式
  const summaryMatch = raw.match(/(?:##\s*)?面试考察重点[\s\S]*?(?=#\s*面试题|##\s*题目|$)/i);
  const summary = summaryMatch ? summaryMatch[0]
    .replace(/^##\s*面试考察重点[\s\n]*/i, "")
    .replace(/^面试考察重点[\s\n]*/i, "")
    .trim() : "";

  // 匹配 "## 题目1" 或 "## 题目 1" 格式的问题块（支持多行）
  const blockPattern =
    /##\s*题目\s*(\d+)\s*\n\s*-\s*\*\*类别\*\*[：:]\s*([^\n]+)\s*\n\s*-\s*\*\*问题\*\*[：:]\s*([^\n]+)\s*(?:\n\s*-\s*\*\*考察要点\*\*[：:]\s*([^\n]+))?\s*(?:\n\s*-\s*\*\*追问方向\*\*[：:]\s*([^\n]+))?/gi;

  const questions: InterviewQuestion[] = [];
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(raw)) !== null) {
    const category = (match[2] ?? "").trim();
    const question = match[3]?.trim() ?? "";
    const rawKeyPoints = match[4]?.trim() ?? "";
    const followUp = match[5]?.trim();

    if (!question) continue;

    // 考察要点用逗号、顿号或换行分隔
    const keyPoints = rawKeyPoints
      ? rawKeyPoints
          .split(/[，,、\n]+/)
          .map((k) => k.replace(/^-\s*/, "").replace(/^  /, "").trim())
          .filter(Boolean)
      : [];

    questions.push({
      category,
      question,
      keyPoints,
      difficulty: "中等",
      followUp: followUp || undefined,
    });
  }

  if (questions.length === 0) return null;

  return { questions, summary };
}
