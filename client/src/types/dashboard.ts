/**
 * Dashboard 活动类型
 */
export interface Activity {
  id: number;
  userId: number;
  type: "upload" | "screening" | "pass" | "reject" | "interview";
  resumeId: number | null;
  resumeName: string | null;
  description: string | null;
  createdAt: string;
}

/**
 * Dashboard 统计数据
 */
export interface DashboardStats {
  total: number;
  pending: number;
  passed: number;
  rejected: number;
  todayCount: number;
  recentActivities: Activity[];
  weeklyData: { day: string; count: number }[];
}

/**
 * 记录活动参数
 */
export interface LogActivityParams {
  type: Activity["type"];
  resumeId?: number;
  resumeName?: string;
  description?: string;
}

/** 活动列表分页（全页） */
export interface ActivitiesListResult {
  list: Activity[];
  total: number;
  page: number;
  pageSize: number;
}
