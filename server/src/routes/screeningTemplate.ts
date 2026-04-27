import express, { Request, Response, Router } from "express";
import { db } from "../db/index.js";
import { screeningTemplates } from "../db/schema.js";
import { eq, desc, and } from "drizzle-orm";
import { authenticate } from "../middleware/auth.js";

const router: Router = express.Router();

/**
 * 获取模板详情
 */
router.get("/screening-templates/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = parseInt(req.params.id as string);

    const [row] = await db
      .select()
      .from(screeningTemplates)
      .where(and(eq(screeningTemplates.id, id), eq(screeningTemplates.userId, userId)));

    if (!row) {
      return res.status(404).json({ code: 404, message: "模板不存在" });
    }

    res.json({ code: 200, data: row });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message || "获取失败" });
  }
});

/**
 * 获取模板列表
 */
router.get("/screening-templates", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const list = await db
      .select()
      .from(screeningTemplates)
      .where(eq(screeningTemplates.userId, userId))
      .orderBy(desc(screeningTemplates.createdAt));

    res.json({
      code: 200,
      data: list,
    });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message || "获取失败" });
  }
});

/**
 * 创建模板
 */
router.post("/screening-templates", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { name, config } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ code: 400, message: "请输入模版名称" });
    }
    if (!config) {
      return res.status(400).json({ code: 400, message: "缺少筛选条件配置" });
    }

    const configJson = typeof config === "string" ? config : JSON.stringify(config);

    // 如果是第一个模板，设为默认
    const existing = await db
      .select()
      .from(screeningTemplates)
      .where(eq(screeningTemplates.userId, userId));
    const isFirst = existing.length === 0;

    const [row] = await db
      .insert(screeningTemplates)
      .values({
        userId,
        name: name.trim(),
        config: configJson,
        isDefault: isFirst ? 1 : 0,
      })
      .returning();

    res.json({ code: 200, data: row });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message || "创建失败" });
  }
});

/**
 * 更新模板
 */
router.put("/screening-templates/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    if (!userId) {
      return res.status(401).json({ code: 401, message: "未授权" });
    }
    const id = parseInt(req.params.id as string);
    const { name, config } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ code: 400, message: "请输入模版名称" });
    }
    if (!config) {
      return res.status(400).json({ code: 400, message: "缺少筛选条件配置" });
    }

    const [existing] = await db
      .select()
      .from(screeningTemplates)
      .where(and(eq(screeningTemplates.id, id), eq(screeningTemplates.userId, userId)));

    if (!existing) {
      return res.status(404).json({ code: 404, message: "模板不存在" });
    }

    const configJson = typeof config === "string" ? config : JSON.stringify(config);

    await db
      .update(screeningTemplates)
      .set({ name: name.trim(), config: configJson })
      .where(and(eq(screeningTemplates.id, id), eq(screeningTemplates.userId, userId)));

    const [updated] = await db
      .select()
      .from(screeningTemplates)
      .where(and(eq(screeningTemplates.id, id), eq(screeningTemplates.userId, userId)));

    res.json({ code: 200, data: updated });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message || "更新失败" });
  }
});

/**
 * 删除模板
 */
router.delete("/screening-templates/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    if (!userId) {
      return res.status(401).json({ code: 401, message: "未授权" });
    }
    const id = parseInt(req.params.id as string);

    const [existing] = await db
      .select()
      .from(screeningTemplates)
      .where(and(eq(screeningTemplates.id, id), eq(screeningTemplates.userId, userId)));

    if (!existing) {
      return res.status(404).json({ code: 404, message: "模板不存在" });
    }

    await db.delete(screeningTemplates).where(
      and(eq(screeningTemplates.id, id), eq(screeningTemplates.userId, userId)),
    );

    // 如果删除的是默认模板，自动提升第一个为默认
    if (existing.isDefault) {
      const [first] = await db
        .select()
        .from(screeningTemplates)
        .where(eq(screeningTemplates.userId, existing.userId))
        .orderBy(desc(screeningTemplates.createdAt))
        .limit(1);
      if (first) {
        await db
          .update(screeningTemplates)
          .set({ isDefault: 1 })
          .where(eq(screeningTemplates.id, first.id));
      }
    }

    res.json({ code: 200, message: "删除成功" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message || "删除失败" });
  }
});

/**
 * 复制模板
 */
router.post("/screening-templates/:id/duplicate", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    if (!userId) {
      return res.status(401).json({ code: 401, message: "未授权" });
    }
    const id = parseInt(req.params.id as string);
    const { name } = req.body;

    const [source] = await db
      .select()
      .from(screeningTemplates)
      .where(and(eq(screeningTemplates.id, id), eq(screeningTemplates.userId, userId)));

    if (!source) {
      return res.status(404).json({ code: 404, message: "模板不存在" });
    }

    const [dup] = await db
      .insert(screeningTemplates)
      .values({
        userId: source.userId,
        name: name || `${source.name} (副本)`,
        config: source.config,
        isDefault: 0,
      })
      .returning();

    res.json({ code: 200, data: dup });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message || "复制失败" });
  }
});

/**
 * 设为默认模板
 */
router.post("/screening-templates/:id/set-default", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    if (!userId) {
      return res.status(401).json({ code: 401, message: "未授权" });
    }
    const id = parseInt(req.params.id as string);

    const [target] = await db
      .select()
      .from(screeningTemplates)
      .where(and(eq(screeningTemplates.id, id), eq(screeningTemplates.userId, userId)));

    if (!target) {
      return res.status(404).json({ code: 404, message: "模板不存在" });
    }

    // 取消该用户所有默认标记
    await db
      .update(screeningTemplates)
      .set({ isDefault: 0 })
      .where(eq(screeningTemplates.userId, userId));

    // 设为默认
    await db
      .update(screeningTemplates)
      .set({ isDefault: 1 })
      .where(and(eq(screeningTemplates.id, id), eq(screeningTemplates.userId, userId)));

    res.json({ code: 200, message: "设置成功" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message || "设置失败" });
  }
});

export default router;
