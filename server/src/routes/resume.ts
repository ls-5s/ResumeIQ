import express, { Request, Response, Router } from "express";
import path from "path";
import fs from "fs";
import { db } from "../db/index.js";
import { resumes, activities } from "../db/schema.js";
import { parseDocument, getFileType } from "../services/resume/parser.js";
import { eq, desc, inArray, and, or, gte, lte, like } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { extractContactInfo, upload } from "../utils/resume.js";
import { getUploadsRoot } from "../utils/uploadPaths.js";
import { authenticate } from "../middleware/auth.js";
import {
  fetchEmailsWithAttachments,
  saveAttachmentToResume,
} from "../services/resume/fetcher.js";
import { createActivity } from "../services/dashboard/dashboard.js";
import { getUserVisibleTeamIds, getUserTeam } from "../services/team/team.js";

// 简历状态类型
type ResumeStatus = "pending" | "rejected" | "passed";

const router: Router = express.Router();

/**
 * 上传简历
 */
router.post(
  "/resume/upload",
  authenticate,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          code: 400,
          message: "请选择要上传的文件",
        });
      }

      // 获取用户ID
      const userId = Number((req as any).user?.id);
      if (!userId) {
        return res.status(401).json({ code: 401, message: "未授权" });
      }

      const file = req.file;
      // 解码文件名（处理浏览器对中文文件名的 URL 编码）
      let originalFileName = file.originalname;
      try {
        // 尝试解码，可能已经被浏览器解码过了
        originalFileName = decodeURIComponent(file.originalname);
      } catch {
        // 如果解码失败，直接使用原始文件名
      }
      const fileType = getFileType(originalFileName);
      const fileSize = file.size;
      const filePath = file.path;

      // 解析文档内容
      const parseResult = await parseDocument(filePath, originalFileName);

      if (parseResult.error) {
        // 删除上传的文件
        fs.unlinkSync(filePath);
        return res.status(400).json({
          code: 400,
          message: parseResult.error,
        });
      }

      // 从解析内容中提取联系信息
      const extractedInfo = extractContactInfo(parseResult.content);

      // 优先使用表单数据，否则使用提取的信息
      const name =
        req.body.name ||
        extractedInfo.name ||
        originalFileName.replace(/\.(pdf|docx|doc)$/i, "");
      const email = req.body.email || extractedInfo.email || "";
      const phone = req.body.phone || extractedInfo.phone || "";

      // 自动获取用户所属的团队（优先 owner 的团队）
      const team = await getUserTeam(userId);
      const teamId = team.id > 0 ? team.id : null;

      // 插入数据库
      const createdAt = new Date().toISOString();
      await db.insert(resumes).values({
        userId,
        teamId,
        name,
        email,
        phone,
        resumeFile: filePath,
        originalFileName,
        fileType,
        fileSize,
        parsedContent: parseResult.content,
        status: "pending", // 初始化为待筛选状态
        createdAt,
      });

      // 获取刚插入的记录（按创建时间排序取最新的）
      const [newResume] = await db
        .select()
        .from(resumes)
        .orderBy(desc(resumes.id))
        .limit(1);

      // 记录活动日志
      if (newResume) {
        await createActivity({
          userId,
          type: "upload",
          resumeId: newResume.id,
          resumeName: newResume.name,
          description: `上传了简历: ${originalFileName}`,
        });
      }

      res.json({
        code: 200,
        message: "简历上传成功",
        data: newResume,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message || "上传失败",
      });
    }
  },
);

/**
 * 获取简历列表（支持预筛选）
 * Query 参数（均可选）：
 *   - keywords: 关键词，多个用逗号分隔，匹配 name/email/phone/parsedContent
 *   - keywordMode: and | or，默认 or
 *   - minScore: 最低分（整数）
 *   - dateFrom: 导入时间起（YYYY-MM-DD）
 *   - dateTo: 导入时间止（YYYY-MM-DD）
 *   - status: pending | passed | rejected
 */
router.get("/resumes", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    if (!userId) {
      return res.status(401).json({ code: 401, message: "未授权" });
    }

    const {
      keywords,
      keywordMode = "or",
      minScore,
      dateFrom,
      dateTo,
      status,
    } = req.query as Record<string, string>;

    // 关键词筛选（parsedContent 模糊匹配）
    let keywordCondition: SQL<unknown> | undefined;
    if (keywords?.trim()) {
      const kwList = keywords
        .split(/[,，\s\n]+/)
        .map((k) => k.trim())
        .filter(Boolean);

      if (kwList.length > 0) {
        if (keywordMode === "and") {
          keywordCondition = and(
            ...kwList.map((kw) => like(resumes.parsedContent, `%${kw}%`)),
          );
        } else {
          keywordCondition = or(
            ...kwList.map((kw) => like(resumes.parsedContent, `%${kw}%`)),
          );
        }
      }
    }

    // 最低分
    const minScoreCond =
      minScore !== undefined && minScore !== "" && !isNaN(Number(minScore))
        ? gte(resumes.score, Number(minScore))
        : undefined;

    // 日期范围（createdAt 为 TEXT，传 ISO 字符串）
    const dateFromCond = dateFrom?.trim()
      ? gte(resumes.createdAt, new Date(dateFrom).toISOString())
      : undefined;
    const dateToCond = dateTo?.trim()
      ? (() => {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          return lte(resumes.createdAt, end.toISOString());
        })()
      : undefined;

    // 状态
    const statusCond =
      status && ["pending", "passed", "rejected"].includes(status)
        ? eq(resumes.status, status)
        : undefined;

    // 获取用户所属的所有团队 ID
    const teamIds = await getUserVisibleTeamIds(userId);

    // 可见条件：自己上传的 OR 属于团队的
    const visibleCondition = or(
      eq(resumes.userId, userId),
      teamIds.length > 0 ? inArray(resumes.teamId, teamIds) : undefined,
    );

    const whereClause = and(
      visibleCondition,
      keywordCondition,
      minScoreCond,
      dateFromCond,
      dateToCond,
      statusCond,
    );

    const resumeList = await db
      .select()
      .from(resumes)
      .where(whereClause)
      .orderBy(desc(resumes.createdAt));

    res.json({
      code: 200,
      data: resumeList,
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message || "获取失败",
    });
  }
});

/**
 * 获取简历详情（支持团队可见）
 */
router.get("/resume/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    if (!userId) {
      return res.status(401).json({ code: 401, message: "未授权" });
    }
    const id = parseInt(req.params.id as string);
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, id));

    if (!resume) {
      return res.status(404).json({
        code: 404,
        message: "简历不存在",
      });
    }

    // 可见性检查：自己上传的 或 属于团队的
    const teamIds = await getUserVisibleTeamIds(userId);
    const canView =
      resume.userId === userId ||
      (resume.teamId !== null && teamIds.includes(resume.teamId));

    if (!canView) {
      return res.status(403).json({
        code: 403,
        message: "无权查看此简历",
      });
    }

    res.json({
      code: 200,
      data: resume,
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message || "获取失败",
    });
  }
});

/**
 * 删除简历（支持团队可见，仅上传者可删除）
 */
router.delete(
  "/resume/:id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = Number((req as any).user?.id);
      if (!userId) {
        return res.status(401).json({ code: 401, message: "未授权" });
      }
      const id = parseInt(req.params.id as string);
      const [resume] = await db.select().from(resumes).where(eq(resumes.id, id));

      if (!resume) {
        return res.status(404).json({
          code: 404,
          message: "简历不存在",
        });
      }

      // 可见性检查 + 权限检查：仅上传者可删除（保护团队资源不被其他成员误删）
      const teamIds = await getUserVisibleTeamIds(userId);
      const canView =
        resume.userId === userId ||
        (resume.teamId !== null && teamIds.includes(resume.teamId));

      if (!canView) {
        return res.status(403).json({
          code: 403,
          message: "无权删除此简历",
        });
      }

      if (resume.userId !== userId) {
        return res.status(403).json({
          code: 403,
          message: "仅上传者可删除简历",
        });
      }

      // 删除磁盘文件（安全检查：仅允许删除 uploads 目录下的文件）
      if (resume.resumeFile) {
        const uploadsDir = getUploadsRoot();
        const resolvedFile = path.resolve(resume.resumeFile);
        if (resolvedFile.startsWith(uploadsDir)) {
          try {
            if (fs.existsSync(resolvedFile)) {
              fs.unlinkSync(resolvedFile);
            }
          } catch {
            // 忽略文件删除错误
          }
        }
      }

      // 删除数据库记录
      await db.delete(resumes).where(eq(resumes.id, id));

      res.json({
        code: 200,
        message: "删除成功",
      });
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message || "删除失败",
      });
    }
  },
);

/**
 * 更新简历状态（支持团队可见）
 */
router.put(
  "/resume/:id/status",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = Number((req as any).user?.id);
      if (!userId) {
        return res.status(401).json({ code: 401, message: "未授权" });
      }
      const id = parseInt(req.params.id as string);
      const { status } = req.body;

      // 验证状态值
      const validStatuses: ResumeStatus[] = ["pending", "rejected", "passed"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          code: 400,
          message: "无效的状态值，应为 pending、rejected 或 passed",
        });
      }

      const [existingResume] = await db
        .select()
        .from(resumes)
        .where(eq(resumes.id, id));

      if (!existingResume) {
        return res.status(404).json({
          code: 404,
          message: "简历不存在",
        });
      }

      // 可见性检查：自己上传的 或 属于团队的
      const teamIds = await getUserVisibleTeamIds(userId);
      const canView =
        existingResume.userId === userId ||
        (existingResume.teamId !== null && teamIds.includes(existingResume.teamId));

      if (!canView) {
        return res.status(403).json({
          code: 403,
          message: "无权操作此简历",
        });
      }

      // 更新状态
      await db.update(resumes).set({ status }).where(eq(resumes.id, id));

      // 记录活动日志
      const activityType =
        status === "passed"
          ? "pass"
          : status === "rejected"
            ? "reject"
            : "screening";
      await createActivity({
        userId: existingResume.userId,
        type: activityType,
        resumeId: existingResume.id,
        resumeName: existingResume.name,
        description: `简历状态更新为: ${status === "passed" ? "通过" : status === "rejected" ? "拒绝" : "待筛选"}`,
      });

      res.json({
        code: 200,
        message: "状态更新成功",
      });
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message || "更新失败",
      });
    }
  },
);

/**
 * 从邮箱导入简历
 */
router.post(
  "/resume/import-from-email",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      // 优先使用请求体中的 userId，否则使用 token 中的用户 ID
      const tokenUserId = (req as any).user.id;
      const { configId, userId, since, limit } = req.body;
      const effectiveUserId = userId || tokenUserId;

      if (!configId) {
        return res.status(400).json({
          code: 400,
          message: "请选择邮箱配置",
        });
      }

      // 自动获取用户所属的团队（优先 owner 的团队）
      const team = await getUserTeam(effectiveUserId);
      const teamId = team.id > 0 ? team.id : null;

      // 从邮箱获取邮件（包含简历附件）
      const emails = await fetchEmailsWithAttachments({
        configId,
        userId: effectiveUserId,
        since: since ? new Date(since) : undefined,
        limit: limit || 10,
      });

      if (emails.length === 0) {
        return res.json({
          code: 200,
          message: "未找到包含简历附件的邮件",
          data: { imported: 0, resumes: [] },
        });
      }

      const importedResumes: any[] = [];

      // 遍历每封邮件，保存附件为简历
      for (const email of emails) {
        for (const attachment of email.attachments) {
          try {
            // 保存附件到简历目录
            const { filePath, originalFileName } = saveAttachmentToResume(
              attachment.content,
              attachment.filename,
              effectiveUserId,
            );

            const fileType = getFileType(originalFileName);
            const fileSize = attachment.content.length;

            // 解析文档内容
            const parseResult = await parseDocument(filePath, originalFileName);

            if (parseResult.error) {
              continue;
            }

            // 从解析内容中提取联系信息（简历正文 → 最准确）
            const extractedInfo = extractContactInfo(parseResult.content);

            // 候选人邮箱应从简历正文解析，不从邮件发件人取（发件人是 HR/猎头，非候选人）
            const candidateEmail = extractedInfo.email || "";

            // 使用邮件主题作为简历名称（去掉 Re: , Fw: 等前缀）
            const name =
              email.subject
                .replace(/^(Re:|Fw:|转发:|回复:)\s*/i, "")
                .replace(/\.(pdf|docx?|doc)$/i, "")
                .trim() || originalFileName.replace(/\.(pdf|docx?|doc)$/i, "");

            const createdAt = new Date().toISOString();
            // 插入数据库（显式 ISO 时间，避免 SQLite 默认值被写成不可解析字符串）
            await db.insert(resumes).values({
              userId: effectiveUserId,
              teamId,
              name,
              email: candidateEmail,
              phone: extractedInfo.phone || "",
              resumeFile: filePath,
              originalFileName,
              fileType,
              fileSize,
              parsedContent: parseResult.content,
              status: "pending",
              createdAt,
            });

            // 获取刚插入的记录
            const [newResume] = await db
              .select()
              .from(resumes)
              .orderBy(desc(resumes.id))
              .limit(1);

            // 记录活动日志
            if (newResume) {
              await createActivity({
                userId: effectiveUserId,
                type: "upload",
                resumeId: newResume.id,
                resumeName: newResume.name,
                description: `从邮箱导入简历: ${originalFileName}`,
              });
            }

            importedResumes.push(newResume);
          } catch {
            // 忽略保存错误
          }
        }
      }

      res.json({
        code: 200,
        message: `成功导入 ${importedResumes.length} 份简历`,
        data: {
          imported: importedResumes.length,
          resumes: importedResumes,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message || "导入失败",
      });
    }
  },
);

/**
 * 批量更新简历状态（支持团队可见）
 */
router.post(
  "/resume/batch-status",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = Number((req as any).user?.id);
      if (!userId) {
        return res.status(401).json({ code: 401, message: "未授权" });
      }
      const { ids, status } = req.body;

      // 验证状态值
      const validStatuses: ResumeStatus[] = ["pending", "rejected", "passed"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          code: 400,
          message: "无效的状态值，应为 pending、rejected 或 passed",
        });
      }

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          code: 400,
          message: "请提供简历 ID 列表",
        });
      }

      // 获取用户所属的所有团队 ID
      const teamIds = await getUserVisibleTeamIds(userId);

      // 查询所有符合可见条件的简历（自己上传的 OR 属于团队的）
      const allResumes = await db
        .select({ id: resumes.id, userId: resumes.userId, teamId: resumes.teamId })
        .from(resumes)
        .where(inArray(resumes.id, ids));

      const accessibleIds = allResumes
        .filter((r) => r.userId === userId || (r.teamId !== null && teamIds.includes(r.teamId)))
        .map((r) => r.id);

      if (accessibleIds.length === 0) {
        return res.status(403).json({ code: 403, message: "无权操作这些简历" });
      }

      // 批量更新状态
      await db
        .update(resumes)
        .set({ status })
        .where(inArray(resumes.id, accessibleIds));

      res.json({
        code: 200,
        message: "批量状态更新成功",
      });
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message || "更新失败",
      });
    }
  },
);

export default router;
