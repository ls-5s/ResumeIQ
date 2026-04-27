import { db } from "../../db/index.js";
import { teams, teamMembers, users, teamInvites } from "../../db/schema.js";
import { eq, and, inArray } from "drizzle-orm";
import crypto from "crypto";

export type MemberRole = "owner" | "admin" | "member";

export interface TeamInfo {
  id: number;
  name: string;
  description: string | null;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberInfo {
  id: number;
  teamId: number;
  userId: number;
  username: string;
  email: string;
  avatar: string | null;
  role: MemberRole;
  joinedAt: string;
}

export interface InviteData {
  email: string;
  role?: "admin" | "member";
}

// ============================================================================
// 辅助函数
// ============================================================================

/** 检查用户是否是团队管理员（owner 或 admin） */
async function isTeamAdmin(teamId: number, userId: number): Promise<boolean> {
  // 检查是否是 owner
  const [team] = await db
    .select({ ownerId: teams.ownerId })
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.ownerId, userId)))
    .limit(1);

  if (team) return true;

  // 检查是否是 admin
  const [membership] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.role, "admin")
      )
    )
    .limit(1);

  return !!membership;
}

// ============================================================================
// 主函数
// ============================================================================

// 获取用户所属的团队（优先返回 owner 团队，否则返回 member/admin 所属团队）
export async function getUserTeam(userId: number): Promise<TeamInfo> {
  // 1. 首先查找用户作为 owner 的团队（owner 优先）
  const [ownerTeam] = await db
    .select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      ownerId: teams.ownerId,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
    })
    .from(teams)
    .where(eq(teams.ownerId, userId))
    .limit(1);

  if (ownerTeam) return ownerTeam;

  // 2. 查找用户作为 member/admin 的团队
  const [membership] = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))
    .limit(1);

  if (membership) {
    const [team] = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        ownerId: teams.ownerId,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
      })
      .from(teams)
      .where(eq(teams.id, membership.teamId))
      .limit(1);

    if (team) return team;
  }

  // 3. 找不到任何团队，返回 null 而不是自动创建
  // 前端需要处理这种情况
  return {
    id: 0,
    name: "",
    description: null,
    ownerId: 0,
    createdAt: "",
    updatedAt: "",
  };
}

// 更新团队信息
export async function updateTeam(
  userId: number,
  data: { name?: string; description?: string }
): Promise<TeamInfo> {
  // 直接查询用户作为 owner 的团队
  const [team] = await db
    .select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      ownerId: teams.ownerId,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
    })
    .from(teams)
    .where(eq(teams.ownerId, userId))
    .limit(1);

  if (!team) {
    throw new Error("你不是团队所有者，无法修改团队信息");
  }

  if (team.ownerId !== userId) {
    throw new Error("只有团队所有者可以修改团队信息");
  }

  const [updated] = await db
    .update(teams)
    .set({ name: data.name, description: data.description })
    .where(eq(teams.id, team.id))
    .returning();

  return updated;
}

// 获取团队成员列表
export async function getTeamMembers(userId: number): Promise<TeamMemberInfo[]> {
  const team = await getUserTeam(userId);

  // 用户没有团队，返回空数组
  if (team.id === 0) {
    return [];
  }

  // 获取 teamMembers 表中的所有成员（包含 owner/admin/member）
  const rows = await db
    .select({
      id: teamMembers.id,
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      username: users.username,
      email: users.email,
      avatar: users.avatar,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, team.id))
    .orderBy(teamMembers.joinedAt);

  // 查找 owner（owner 不在 teamMembers 表中）
  const [owner] = await db
    .select({
      username: users.username,
      email: users.email,
      avatar: users.avatar,
    })
    .from(users)
    .where(eq(users.id, team.ownerId))
    .limit(1);

  // 检查 owner 是否已在 rows 中（不应该，因为 owner 不在 teamMembers 表）
  const ownerInMembers = rows.some((m) => m.userId === team.ownerId);

  // 如果 owner 存在且不在列表中，将其添加到首位
  if (owner && !ownerInMembers) {
    // 确保日期有效，如果是空字符串则使用当前时间
    const ownerJoinedAt = team.createdAt || new Date().toISOString();
    return [
      {
        id: 0, // owner 没有 teamMembers.id，用 0 表示
        teamId: team.id,
        userId: team.ownerId,
        username: owner.username,
        email: owner.email,
        avatar: owner.avatar,
        role: "owner" as const,
        joinedAt: ownerJoinedAt,
      },
      ...rows,
    ] as TeamMemberInfo[];
  }

  // 确保所有日期都是有效的 ISO 格式
  return rows.map((row) => ({
    ...row,
    joinedAt: row.joinedAt || new Date().toISOString(),
  })) as TeamMemberInfo[];
}

// 邀请成员加入团队
export async function inviteMember(
  inviterId: number,
  data: InviteData
): Promise<TeamMemberInfo> {
  // 直接查询用户作为 admin 的团队（需要权限检查）
  const team = await getUserTeam(inviterId);
  if (team.id === 0) {
    throw new Error("你不在任何团队中，无法邀请成员");
  }

  // 权限检查：只有 owner 和 admin 可以邀请
  const canInvite = await isTeamAdmin(team.id, inviterId);
  if (!canInvite) {
    throw new Error("只有团队管理员可以邀请新成员");
  }

  // 查找被邀请的用户
  const [invitee] = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (!invitee) {
    throw new Error("该邮箱尚未注册，无法邀请");
  }

  // 检查是否已是团队成员
  const [existing] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, team.id),
        eq(teamMembers.userId, invitee.id)
      )
    )
    .limit(1);

  if (existing) {
    throw new Error("该用户已在团队中");
  }

  // 添加成员
  const [newMember] = await db
    .insert(teamMembers)
    .values({
      teamId: team.id,
      userId: invitee.id,
      role: data.role || "member",
    })
    .returning();

  return {
    id: newMember.id,
    teamId: newMember.teamId,
    userId: newMember.userId,
    username: invitee.username,
    email: invitee.email,
    avatar: invitee.avatar,
    role: newMember.role as MemberRole,
    joinedAt: newMember.joinedAt,
  };
}

// 移除团队成员
export async function removeMember(
  operatorId: number,
  memberId: number
): Promise<void> {
  const team = await getUserTeam(operatorId);
  if (team.id === 0) {
    throw new Error("你不在任何团队中");
  }

  // 自己离开团队：检查是否是团队成员即可
  if (operatorId === memberId) {
    const [selfMembership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, operatorId)
        )
      )
      .limit(1);

    if (!selfMembership) {
      throw new Error("你不是团队成员");
    }
    if (selfMembership.role === "owner") {
      throw new Error("所有者不能离开团队，请先转让所有权");
    }
    await db.delete(teamMembers).where(eq(teamMembers.id, selfMembership.id));
    return;
  }

  // 移除其他成员：需要 owner 或 admin 权限
  const canRemove = await isTeamAdmin(team.id, operatorId);
  if (!canRemove) {
    throw new Error("只有团队管理员可以移除成员");
  }

  // 查找要移除的成员
  const [targetMembership] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, team.id),
        eq(teamMembers.userId, memberId)
      )
    )
    .limit(1);

  if (!targetMembership) {
    throw new Error("该成员不在团队中");
  }

  // 不能移除 owner
  if (targetMembership.role === "owner") {
    throw new Error("不能移除团队所有者");
  }

  await db.delete(teamMembers).where(eq(teamMembers.id, targetMembership.id));
}

// 更新成员角色
export async function updateMemberRole(
  operatorId: number,
  memberId: number,
  newRole: "admin" | "member"
): Promise<TeamMemberInfo> {
  // 直接查询用户作为 owner 的团队
  const [team] = await db
    .select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      ownerId: teams.ownerId,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
    })
    .from(teams)
    .where(eq(teams.ownerId, operatorId))
    .limit(1);

  if (!team) {
    throw new Error("你不是团队所有者，无法修改成员角色");
  }

  // 只有 owner 可以修改角色
  if (team.ownerId !== operatorId) {
    throw new Error("只有团队所有者可以修改成员角色");
  }

  // 查找要修改的成员
  const [targetMembership] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, team.id),
        eq(teamMembers.userId, memberId)
      )
    )
    .limit(1);

  if (!targetMembership) {
    throw new Error("该成员不在团队中");
  }

  // 不能修改 owner 的角色
  if (targetMembership.role === "owner") {
    throw new Error("不能修改团队所有者的角色");
  }

  const [updated] = await db
    .update(teamMembers)
    .set({ role: newRole })
    .where(eq(teamMembers.id, targetMembership.id))
    .returning();

  // 获取用户信息
  const [userInfo] = await db
    .select({
      username: users.username,
      email: users.email,
      avatar: users.avatar,
    })
    .from(users)
    .where(eq(users.id, memberId))
    .limit(1);

  return {
    id: updated.id,
    teamId: updated.teamId,
    userId: updated.userId,
    username: userInfo.username,
    email: userInfo.email,
    avatar: userInfo.avatar,
    role: updated.role as MemberRole,
    joinedAt: updated.joinedAt,
  };
}

// 获取用户当前团队的角色
export async function getUserRole(userId: number): Promise<MemberRole | null> {
  // 1. 首先检查是否是团队 owner（优先）
  const [team] = await db
    .select({ ownerId: teams.ownerId })
    .from(teams)
    .where(eq(teams.ownerId, userId))
    .limit(1);

  if (team) {
    return "owner";
  }

  // 2. 检查 team_members 表获取 admin/member 角色
  const [membership] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))
    .limit(1);

  if (membership) {
    return membership.role as MemberRole;
  }

  return null;
}

// 获取用户在某个团队的角色
export async function getMemberRole(
  userId: number,
  teamId: number
): Promise<MemberRole | null> {
  const [membership] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.userId, userId),
        eq(teamMembers.teamId, teamId)
      )
    )
    .limit(1);

  return membership?.role as MemberRole ?? null;
}

// 获取用户可见的团队 ID 列表（用户自己的 + 所属团队的）
export async function getUserVisibleTeamIds(userId: number): Promise<number[]> {
  // 1. 获取用户作为 owner 的团队
  const ownedTeams = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.ownerId, userId));

  // 2. 获取用户作为 member/admin 的团队
  const memberships = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));

  // 3. 合并去重
  const teamIdSet = new Set<number>();
  ownedTeams.forEach((t) => teamIdSet.add(t.id));
  memberships.forEach((m) => teamIdSet.add(m.teamId));

  return Array.from(teamIdSet);
}

// ============================================================================
// 邀请链接相关
// ============================================================================

export interface InviteLinkInfo {
  token: string;
  inviteUrl: string;
  expiresAt: string;
  role: "admin" | "member";
  teamName: string;
}

/** 生成邀请链接 */
export async function createInviteLink(
  inviterId: number,
  data: { role?: "admin" | "member" },
): Promise<InviteLinkInfo> {
  const team = await getUserTeam(inviterId);
  if (team.id === 0) {
    throw new Error("你不在任何团队中，无法邀请成员");
  }

  // 权限检查：只有 owner 和 admin 可以邀请
  const canInvite = await isTeamAdmin(team.id, inviterId);
  if (!canInvite) {
    throw new Error("只有团队管理员可以邀请新成员");
  }

  // 生成 token（有效期 7 天）
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db.insert(teamInvites).values({
    teamId: team.id,
    inviterId,
    token,
    role: data.role || "member",
    status: "pending",
    expiresAt,
  });

  return {
    token,
    inviteUrl: `${process.env.APP_URL || "http://localhost:5173"}/invite/${token}`,
    expiresAt,
    role: data.role || "member",
    teamName: team.name,
  };
}

/** 通过 token 申请加入团队 */
export async function applyToJoin(token: string, applicantId: number): Promise<void> {
  const [invite] = await db
    .select()
    .from(teamInvites)
    .where(eq(teamInvites.token, token))
    .limit(1);

  if (!invite) {
    throw new Error("邀请链接无效");
  }
  if (invite.status === "accepted") {
    throw new Error("此邀请已被使用");
  }
  if (invite.status === "rejected") {
    throw new Error("此邀请已被拒绝，请联系管理员重新邀请");
  }
  if (invite.status === "waiting_approval") {
    throw new Error("申请已提交，请等待管理员审核");
  }
  if (new Date(invite.expiresAt) < new Date()) {
    throw new Error("邀请链接已过期");
  }

  // 检查是否已是团队成员
  const [existing] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, invite.teamId), eq(teamMembers.userId, applicantId)))
    .limit(1);

  if (existing) {
    throw new Error("你已是团队成员");
  }

  // 记录申请者 ID 并更新状态为等待审核
  await db
    .update(teamInvites)
    .set({ status: "waiting_approval", applicantId })
    .where(eq(teamInvites.id, invite.id));
}

/** 获取团队的待审核申请列表（仅 owner/admin 可用） */
export async function getPendingInvites(userId: number): Promise<Array<{
  id: number;
  applicantId: number;
  applicantName: string;
  applicantEmail: string;
  role: "admin" | "member";
  status: string;
  expiresAt: string;
  createdAt: string;
  inviterName: string;
  teamName: string;
}>> {
  const team = await getUserTeam(userId);
  if (team.id === 0) {
    throw new Error("你不在任何团队中");
  }

  // 权限检查：只有 owner 和 admin 可以查看
  const canView = await isTeamAdmin(team.id, userId);
  if (!canView) {
    throw new Error("只有团队管理员可以查看申请列表");
  }

  const rows = await db
    .select({
      id: teamInvites.id,
      applicantId: teamInvites.applicantId,
      role: teamInvites.role,
      status: teamInvites.status,
      expiresAt: teamInvites.expiresAt,
      createdAt: teamInvites.createdAt,
      inviterName: users.username,
      teamName: teams.name,
    })
    .from(teamInvites)
    .innerJoin(users, eq(teamInvites.inviterId, users.id))
    .innerJoin(teams, eq(teamInvites.teamId, teams.id))
    .where(
      and(
        eq(teamInvites.teamId, team.id),
        eq(teamInvites.status, "waiting_approval"),
      ),
    )
    .orderBy(teamInvites.createdAt);

  // 获取申请者信息
  const result = await Promise.all(
    rows.map(async (row) => {
      let applicantName = "未知用户";
      let applicantEmail = "";

      if (row.applicantId) {
        try {
          const [applicant] = await db
            .select({ username: users.username, email: users.email })
            .from(users)
            .where(eq(users.id, row.applicantId))
            .limit(1);
          if (applicant) {
            applicantName = applicant.username;
            applicantEmail = applicant.email;
          }
        } catch {
          // 如果查询失败，忽略错误
        }
      }

      return {
        id: row.id,
        applicantId: row.applicantId || 0,
        applicantName,
        applicantEmail,
        role: row.role as "admin" | "member",
        status: row.status,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        inviterName: row.inviterName,
        teamName: row.teamName,
      };
    }),
  );

  return result;
}

/** 批准加入申请（仅 owner/admin 可用） */
export async function approveJoinRequest(operatorId: number, inviteId: number): Promise<TeamMemberInfo> {
  const team = await getUserTeam(operatorId);
  if (team.id === 0) {
    throw new Error("你不在任何团队中");
  }

  // 权限检查：只有 owner 和 admin 可以批准
  const canApprove = await isTeamAdmin(team.id, operatorId);
  if (!canApprove) {
    throw new Error("只有团队管理员可以批准申请");
  }

  // 获取邀请信息
  const [invite] = await db
    .select()
    .from(teamInvites)
    .where(and(eq(teamInvites.id, inviteId), eq(teamInvites.teamId, team.id)))
    .limit(1);

  if (!invite) {
    throw new Error("申请不存在");
  }
  if (invite.status !== "waiting_approval") {
    throw new Error("该申请已处理");
  }

  if (!invite.applicantId) {
    throw new Error("申请者信息不存在");
  }

  // 查找申请者用户
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, invite.applicantId))
    .limit(1);

  if (!user) {
    throw new Error("申请者用户不存在");
  }

  // 检查是否已是团队成员
  const [existingMember] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, user.id)))
    .limit(1);

  if (existingMember) {
    throw new Error("该用户已是团队成员");
  }

  // 添加成员
  const [member] = await db
    .insert(teamMembers)
    .values({
      teamId: team.id,
      userId: user.id,
      role: invite.role as "admin" | "member",
    })
    .returning();

  // 更新邀请状态
  await db
    .update(teamInvites)
    .set({ status: "accepted" })
    .where(eq(teamInvites.id, inviteId));

  return {
    id: member.id,
    teamId: member.teamId,
    userId: member.userId,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    role: member.role as MemberRole,
    joinedAt: member.joinedAt,
  };
}

/** 拒绝加入申请（仅 owner/admin 可用） */
export async function rejectJoinRequest(operatorId: number, inviteId: number): Promise<void> {
  const team = await getUserTeam(operatorId);
  if (team.id === 0) {
    throw new Error("你不在任何团队中");
  }

  // 权限检查：只有 owner 和 admin 可以拒绝
  const canReject = await isTeamAdmin(team.id, operatorId);
  if (!canReject) {
    throw new Error("只有团队管理员可以拒绝申请");
  }

  // 获取邀请信息
  const [invite] = await db
    .select()
    .from(teamInvites)
    .where(and(eq(teamInvites.id, inviteId), eq(teamInvites.teamId, team.id)))
    .limit(1);

  if (!invite) {
    throw new Error("申请不存在");
  }
  if (invite.status !== "waiting_approval") {
    throw new Error("该申请已处理");
  }

  // 更新邀请状态为已拒绝
  await db
    .update(teamInvites)
    .set({ status: "rejected" })
    .where(eq(teamInvites.id, inviteId));
}

/** 通过 token 预览邀请信息（无需登录） */
export async function getInviteInfo(token: string): Promise<{
  teamName: string;
  role: "admin" | "member";
  status: string;
  expiresAt: string;
  inviterName: string;
  inviteeEmail: string | null;
} | null> {
  const [invite] = await db
    .select({
      status: teamInvites.status,
      expiresAt: teamInvites.expiresAt,
      teamName: teams.name,
      role: teamInvites.role,
      inviterName: users.username,
      inviteeEmail: teamInvites.inviteeEmail,
    })
    .from(teamInvites)
    .innerJoin(teams, eq(teamInvites.teamId, teams.id))
    .innerJoin(users, eq(teamInvites.inviterId, users.id))
    .where(eq(teamInvites.token, token))
    .limit(1);

  if (!invite) return null;
  return {
    teamName: invite.teamName,
    role: invite.role as "admin" | "member",
    status: invite.status,
    expiresAt: invite.expiresAt,
    inviterName: invite.inviterName,
    inviteeEmail: invite.inviteeEmail,
  };
}
