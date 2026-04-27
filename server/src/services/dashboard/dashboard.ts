import { db } from "../../db/index.js";
import { resumes, activities } from "../../db/schema.js";
import { eq, and, sql, desc } from "drizzle-orm";
import type { Activity } from "../../db/schema.js";

export interface DashboardStats {
  total: number;
  pending: number;
  passed: number;
  rejected: number;
  todayCount: number;
  recentActivities: any[];
  weeklyData: { day: string; count: number }[];
}

/**
 * 获取 Dashboard 统计数据
 */
export async function getDashboardStats(userId: number): Promise<DashboardStats> {
  // 获取简历总数
  const [totalResult] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(resumes)
    .where(eq(resumes.userId, userId));
  const total = Number(totalResult?.count || 0);

  // 获取待筛选数量
  const [pendingResult] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(resumes)
    .where(and(eq(resumes.userId, userId), eq(resumes.status, "pending")));
  const pending = Number(pendingResult?.count || 0);

  // 获取匹配成功数量
  const [passedResult] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(resumes)
    .where(and(eq(resumes.userId, userId), eq(resumes.status, "passed")));
  const passed = Number(passedResult?.count || 0);

  // 获取被拒绝数量
  const [rejectedResult] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(resumes)
    .where(and(eq(resumes.userId, userId), eq(resumes.status, "rejected")));
  const rejected = Number(rejectedResult?.count || 0);

  // 获取今天的简历数量
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayResult] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(resumes)
    .where(and(
      eq(resumes.userId, userId),
      sql`${resumes.createdAt} >= ${today.toISOString()}`,
    ));
  const todayCount = Number(todayResult?.count || 0);

  // 获取本周每日简历数量（周一 ~ 周日，按创建日期分组）
  // 注意：线上使用 Turso (SQLite)，本地可能用 MySQL，故采用「应用层分组」而非数据库函数
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // 本周一 00:00
  weekStart.setHours(0, 0, 0, 0);

  // 先查出本周的简历记录（不在数据库层分组，避免 SQL 语法差异）
  const weekResumes = await db
    .select({ createdAt: resumes.createdAt })
    .from(resumes)
    .where(and(
      eq(resumes.userId, userId),
      sql`${resumes.createdAt} >= ${weekStart.toISOString()}`,
    ));

  // 在应用层按「星期几」分组统计
  const countByIdx: Record<number, number> = {};
  for (const r of weekResumes) {
    const date = new Date(r.createdAt as string);
    const dayIndex = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
    countByIdx[dayIndex] = (countByIdx[dayIndex] ?? 0) + 1;
  }

  // 按 周一(1) ~ 周日(0) 顺序输出全部 7 天
  const DAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weeklyData = [1, 2, 3, 4, 5, 6, 0].map((idx) => ({
    day: DAY_NAMES[idx],
    count: countByIdx[idx] ?? 0,
  }));

  // 获取最近活动（多取一些再按「简历+类型+描述+时间」去重，避免同一操作被记多次导致重复）
  const rawActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.userId, userId))
    .orderBy(desc(activities.createdAt))
    .limit(20);
  const seen = new Set<string>();
  const recentActivities = rawActivities
    .filter((row: any) => {
      const key = `${row.resumeId ?? ""}-${row.type}-${row.resumeName ?? ""}-${(row.description ?? "").slice(0, 80)}-${row.createdAt?.toISOString?.() ?? row.createdAt}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);

  return {
    total,
    pending,
    passed,
    rejected,
    todayCount,
    recentActivities,
    weeklyData,
  };
}

/**
 * 记录活动
 */
export async function createActivity(params: {
  userId: number;
  type: "upload" | "screening" | "pass" | "reject" | "interview";
  resumeId?: number;
  resumeName?: string;
  description?: string;
}): Promise<void> {
  await db.insert(activities).values({
    userId: params.userId,
    type: params.type,
    resumeId: params.resumeId || null,
    resumeName: params.resumeName || "",
    description: params.description || "",
    createdAt: new Date().toISOString(),
  });
}

export interface ListActivitiesResult {
  list: Activity[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 分页查询当前用户的全部活动（不做去重，便于审计）
 */
export async function listActivities(
  userId: number,
  page: number,
  pageSize: number,
): Promise<ListActivitiesResult> {
  const size = Math.min(100, Math.max(1, Math.floor(pageSize) || 30));
  const p = Math.max(1, Math.floor(page) || 1);
  const offset = (p - 1) * size;

  const [totalResult] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(activities)
    .where(eq(activities.userId, userId));

  const total = Number(totalResult?.count ?? 0);

  const list = await db
    .select()
    .from(activities)
    .where(eq(activities.userId, userId))
    .orderBy(desc(activities.createdAt))
    .limit(size)
    .offset(offset);

  return { list, total, page: p, pageSize: size };
}
