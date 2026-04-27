import instance from "../utils/http";
import type {
  Team,
  TeamMember,
  InviteData,
  InviteLink,
  InvitePreview,
  MemberRole,
  PendingInvite,
} from "../types/team";

// 获取团队信息
export const getTeam = async (): Promise<Team> => {
  return instance.get("/v1/team") as Promise<Team>;
};

// 更新团队信息
export const updateTeam = async (
  data: { name?: string; description?: string }
): Promise<Team> => {
  return instance.put("/v1/team", data) as Promise<Team>;
};

// 获取团队成员
export const getTeamMembers = async (): Promise<TeamMember[]> => {
  return instance.get("/v1/team/members") as Promise<TeamMember[]>;
};

// 获取当前用户角色
export const getCurrentUserRole = async (): Promise<{ role: MemberRole; userId: number }> => {
  return instance.get("/v1/team/role") as Promise<{ role: MemberRole; userId: number }>;
};

// 生成邀请链接
export const createInviteLink = async (data: InviteData): Promise<InviteLink> => {
  return instance.post("/v1/team/members/invite", data) as Promise<InviteLink>;
};

// 移除成员（仅 owner/admin 可用）
export const removeMember = async (memberId: number): Promise<void> => {
  await instance.delete(`/v1/team/members/${memberId}`);
};

// 更新成员角色（仅 owner 可用）
export const updateMemberRole = async (
  memberId: number,
  role: "admin" | "member"
): Promise<TeamMember> => {
  return instance.patch(`/v1/team/members/${memberId}`, { role }) as Promise<TeamMember>;
};

// 离开团队（当前用户离开自己所在的团队）
export const leaveTeam = async (): Promise<void> => {
  await instance.post("/v1/team/leave");
};

// 预览邀请链接信息（无需登录）
export const getInvitePreview = async (token: string): Promise<InvitePreview> => {
  return instance.get(`/v1/team/invites/${token}`) as Promise<InvitePreview>;
};

// 申请加入团队（替代直接接受，需登录）
export const applyToJoinTeam = async (token: string): Promise<void> => {
  await instance.post(`/v1/team/invites/${token}/apply`);
};

// 获取待审核申请列表（仅 owner/admin 可用）
export const getPendingInvites = async (): Promise<PendingInvite[]> => {
  return instance.get("/v1/team/pending-invites") as Promise<PendingInvite[]>;
};

// 批准加入申请（仅 owner/admin 可用）
export const approveInvite = async (inviteId: number): Promise<TeamMember> => {
  return instance.post(`/v1/team/pending-invites/${inviteId}/approve`) as Promise<TeamMember>;
};

// 拒绝加入申请（仅 owner/admin 可用）
export const rejectInvite = async (inviteId: number): Promise<void> => {
  await instance.post(`/v1/team/pending-invites/${inviteId}/reject`);
};
