import type { InterviewQuestion } from "../types/ai";

const VALID_DIFFICULTIES = ["基础", "中等", "进阶"] as const;
type Difficulty = (typeof VALID_DIFFICULTIES)[number];

function normalizeDifficulty(raw: unknown): Difficulty {
  if (typeof raw === "string" && VALID_DIFFICULTIES.includes(raw as Difficulty)) {
    return raw as Difficulty;
  }
  return "中等";
}



/**
 * 将面试题数据格式化为简洁的 Markdown 文档（无考察重点，无 JSON）
 */
export function formatQuestionsToMarkdown(params: {
  questions: InterviewQuestion[];
  candidateName?: string;
  generatedAt?: Date;
}): string {
  const { questions, candidateName, generatedAt } = params;

  const parts: string[] = [];

  // 标题
  parts.push("# 面试题");
  if (candidateName) {
    parts.push(`**候选人**：${candidateName}`);
  }

  // 生成时间
  const time = generatedAt
    ? generatedAt.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
  parts.push(`> 生成时间：${time}`);
  parts.push("");

  // 面试题列表
  questions.forEach((q, i) => {
    const difficulty = normalizeDifficulty(q.difficulty);
    parts.push(`## ${i + 1}. ${q.question}`);
    parts.push("");

    if (q.keyPoints.length > 0) {
      q.keyPoints.forEach((point) => {
        parts.push(`- ${point}`);
      });
      parts.push("");
    }

    if (q.followUp) {
      parts.push(`**追问**：${q.followUp}`);
      parts.push("");
    }

    parts.push("---");
    parts.push("");
  });

  // 底部
  parts.push("> 由 AIScaning 面试题生成器制作");
  return parts.join("\n");
}

/**
 * 将单道题目格式化为简洁的 Markdown（无考察重点）
 */
export function formatSingleQuestion(question: InterviewQuestion, index: number): string {
  const difficulty = normalizeDifficulty(question.difficulty);
  const parts: string[] = [];

  parts.push(`## ${index + 1}. ${question.question}`);
  parts.push("");

  if (question.keyPoints.length > 0) {
    question.keyPoints.forEach((point) => {
      parts.push(`- ${point}`);
    });
    parts.push("");
  }

  if (question.followUp) {
    parts.push(`**追问**：${question.followUp}`);
  }

  return parts.join("\n");
}

/**
 * 解析 raw 文本，尝试提取有效题目，兜底返回空列表（不会崩溃）
 */
export function extractQuestionsFromRaw(raw: string): InterviewQuestion[] {
  if (!raw || raw.length < 10) return [];

  // 去掉 markdown 代码块包裹
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // ── 1. 尝试提取 JSON ──────────────────────────────────────────
  const firstBrace = stripped.indexOf("{");
  const lastBrace = stripped.lastIndexOf("}");
  const jsonStr = firstBrace !== -1 && lastBrace > firstBrace
    ? stripped.slice(firstBrace, lastBrace + 1)
    : null;

  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr) as { questions?: unknown[] };
      const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
      const result: InterviewQuestion[] = [];

      for (const item of rawQuestions) {
        if (!item || typeof item !== "object") continue;
        const obj = item as Record<string, unknown>;

        // 兼容中文字段名
        const category =
          (typeof obj.category === "string" ? obj.category.trim() : "")
          || (typeof obj["类型"] === "string" ? (obj["类型"] as string).trim() : "")
          || "";
        const question =
          (typeof obj.question === "string" ? obj.question.trim() : "")
          || (typeof obj["问题"] === "string" ? (obj["问题"] as string).trim() : "");
        if (!question) continue;

        const difficultyRaw = obj.difficulty ?? obj["难度"];
        const difficulty = normalizeDifficulty(difficultyRaw);

        const keyPointsRaw = obj.keyPoints ?? obj["考察要点"];
        const keyPoints = Array.isArray(keyPointsRaw)
          ? keyPointsRaw.map((k) => (typeof k === "string" ? k.trim() : "")).filter(Boolean)
          : [];

        const followUpRaw = obj.followUp ?? obj["追问"];
        const followUp =
          typeof followUpRaw === "string" && followUpRaw.trim() ? followUpRaw.trim() : undefined;

        result.push({
          category,
          question,
          keyPoints,
          difficulty,
          followUp,
        });
      }

      if (result.length > 0) return result;
    } catch {
      // JSON 解析失败，尝试下一策略
    }
  }

  // ── 2. 尝试文本模式拆分多道题目 ─────────────────────────────
  // 匹配模式：题目一/题目1/一、xxx/1. xxx / ## xxx / ### xxx
  const questionPatterns = [
    /(?:^|\n)(题目[一二三四五六七八九十\d]+[：:]\s*)(.{10,})(?=\n(?:题目[一二三四五六七八九十\d]+[：:]|#{1,3}\s*[一二三四五六七八九十\d]+|\n\n|$))/gis,
    /(?:^|\n)([一二三四五六七八九十\d]+[.、]\s*)(.{10,})(?=\n(?:[一二三四五六七八九十\d]+[.、]|#|\n\n|$))/gis,
    /(?:^|\n)(#{1,3}\s*[一二三四五六七八九十\d]+[.、]\s*)(.{10,})(?=\n\n|$)/gis,
  ];

  for (const pattern of questionPatterns) {
    const matches = [...stripped.matchAll(new RegExp(pattern.source, "gi"))];
    if (matches.length >= 1) {
      const result: InterviewQuestion[] = [];

      for (const match of matches) {
        // 去掉标题部分，保留正文
        const titlePart = match[1] ?? "";
        let content = match[2] ?? "";

        // 提取考察要点
        const keyPoints: string[] = [];
        const keyPointsMatch = content.match(/考察要点[：:]\s*([^\n]+(?:\n(?:  [-*]|- ).+)*)/i);
        if (keyPointsMatch) {
          const kpLines = keyPointsMatch[0].replace(/^考察要点[：:]\s*/i, "").split("\n");
          for (const line of kpLines) {
            const cleaned = line.replace(/^[ 　]*[-*][ 　]/, "").trim();
            if (cleaned) keyPoints.push(cleaned);
          }
          content = content.replace(/考察要点[：:][\s\S]*?(?=\n追问|$)/i, "").trim();
        }

        // 提取追问方向
        let followUp: string | undefined;
        const followUpMatch = content.match(/追问[方向：:]\s*(.+?)(?=\n|$)/i);
        if (followUpMatch) {
          followUp = followUpMatch[1].trim();
          content = content.replace(/追问[方向：:]\s*.+?(?=\n|$)/gi, "").trim();
        }

        // 清理标题残留（如"题目一："）
        const questionText = content.replace(/^题目[一二三四五六七八九十\d]+[：:]\s*/i, "").trim();
        if (questionText.length > 5) {
          result.push({
            category: "",
            question: questionText,
            keyPoints,
            difficulty: keyPoints.length > 0 ? "中等" : "基础",
            followUp,
          });
        }
      }

      if (result.length >= 2) return result;
    }
  }

  // ── 3. 兜底：单段落或短文本 ─────────────────────────────────
  const cleaned = stripped
    .replace(/\}\s*$/g, "")
    .replace(/^(?:题目|问题)\s*[一二三四五六七八九十\d]+[：:]/gi, "")
    .trim();

  if (cleaned && cleaned.length > 10) {
    return [{
      category: "",
      question: cleaned,
      keyPoints: [],
      difficulty: "中等",
      followUp: undefined,
    }];
  }

  return [];
}
