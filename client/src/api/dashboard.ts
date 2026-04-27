import instance from "../utils/http";
import type {
  DashboardStats,
  LogActivityParams,
  ActivitiesListResult,
} from "../types/dashboard";

/**
 * 获取 Dashboard 统计数据
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  return instance.get("/v1/dashboard/stats");
};

/**
 * 上报一条活动流水（上传、筛选、通过/拒绝、发信等）
 */
export const logActivity = async (params: LogActivityParams): Promise<void> => {
  return instance.post("/v1/activity", params);
};

/**
 * 分页拉取当前用户的全部活动流水
 */
export const getActivities = async (params: {
  page?: number;
  pageSize?: number;
}): Promise<ActivitiesListResult> => {
  return instance.get("/v1/activities", { params });
};
