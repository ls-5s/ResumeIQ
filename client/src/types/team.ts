export interface Team {
  id: number;
  name: string;
  description: string | null;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

// 扩展 Team 类型，支持没有团队的用户
export interface TeamOrNull extends Partial<Team> {
  id?: number;
  name?: string;
  description?: string | null;
  ownerId?: number;
  createdAt?: string;
  updatedAt?: string;
  // 标记是否有团队
  hasTeam?: boolean;
}

export type MemberRole = "owner" | "admin" | "member";

export interface TeamMember {
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
  role?: "admin" | "member";
}

export interface InviteLink {
  token: string;
  inviteUrl: string;
  expiresAt: string;
  role: "admin" | "member";
  teamName: string;
}

export interface InvitePreview {
  teamName: string;
  role: "admin" | "member";
  status: string;
  expiresAt: string;
  inviterName: string;
}

export interface PendingInvite {
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
}
