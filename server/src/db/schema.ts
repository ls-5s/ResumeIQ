import {
  sqliteTable,
  text,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// 用户表
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  avatar: text("avatar"),
  githubId: text("github_id").unique(),
  githubUsername: text("github_username"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

// 团队表（需放在 resumes 前，因为 resumes.teamId 引用它）
export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

// 团队成员表
export const teamMembers = sqliteTable(
  "team_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull().default("member"), // owner | admin | member
    joinedAt: text("joined_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (teamMembers) => ({
    teamIdIdx: index("team_member_team_id_idx").on(teamMembers.teamId),
    userIdIdx: index("team_member_user_id_idx").on(teamMembers.userId),
    uniqueMember: index("unique_team_member").on(teamMembers.teamId, teamMembers.userId),
  }),
);

// 团队邀请表
export const teamInvites = sqliteTable(
  "team_invites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    inviterId: integer("inviter_id")
      .notNull()
      .references(() => users.id),
    inviteeEmail: text("invitee_email"),
    token: text("token").notNull().unique(),
    role: text("role").notNull().default("member"), // admin | member
    status: text("status").notNull().default("pending"), // pending | accepted | rejected | expired | waiting_approval
    applicantId: integer("applicant_id").references(() => users.id),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (teamInvites) => ({
    teamIdIdx: index("team_invite_team_id_idx").on(teamInvites.teamId),
    tokenIdx: index("team_invite_token_idx").on(teamInvites.token),
    inviteeEmailIdx: index("team_invite_email_idx").on(teamInvites.inviteeEmail),
  }),
);

// 简历表
export const resumes = sqliteTable(
  "resumes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    teamId: integer("team_id").references(() => teams.id),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    resumeFile: text("resume_file"),
    originalFileName: text("original_file_name"),
    fileType: text("file_type"),
    fileSize: integer("file_size"),
    summary: text("summary"),
    parsedContent: text("parsed_content"),
    score: integer("score"),
    dimensionScores: text("dimension_scores"),
    status: text("status").default("pending").notNull(),
    lastEmailSentAt: text("last_email_sent_at"),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (resumes) => ({
    userIdIdx: index("resume_user_id_idx").on(resumes.userId),
    emailIdx: index("resume_email_idx").on(resumes.email),
  }),
);

// 邮箱配置表
export const emailConfigs = sqliteTable("email_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  email: text("email").notNull(),
  authCode: text("auth_code").notNull(),
  imapHost: text("imap_host").default("imap.qq.com"),
  imapPort: integer("imap_port").default(993),
  smtpHost: text("smtp_host").default("smtp.qq.com"),
  smtpPort: integer("smtp_port").default(465),
  isDefault: integer("is_default").default(0),
  isDeleted: integer("is_deleted").default(0),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

// 邮件模板表
export const emailTemplates = sqliteTable(
  "email_templates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
    updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (emailTemplates) => ({
    userIdIdx: index("email_template_user_id_idx").on(emailTemplates.userId),
  }),
);

// AI 配置表
export const aiConfigs = sqliteTable(
  "ai_configs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull().default("默认配置"),
    model: text("model").notNull().default("gpt-4o"),
    apiUrl: text("api_url").notNull().default("https://api.openai.com/v1"),
    apiKey: text("api_key"),
    prompt: text("prompt"),
    isDefault: integer("is_default").default(0),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
    updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (aiConfigs) => ({
    userIdIdx: index("ai_config_user_id_idx").on(aiConfigs.userId),
  }),
);

// 活动日志表
export const activities = sqliteTable(
  "activities",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    type: text("type").notNull(),
    resumeId: integer("resume_id"),
    resumeName: text("resume_name"),
    description: text("description"),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (activities) => ({
    userIdIdx: index("activity_user_id_idx").on(activities.userId),
    createdAtIdx: index("activity_created_at_idx").on(activities.createdAt),
  }),
);

// 表关系定义
export const usersRelations = relations(users, ({ many }) => ({
  emailConfigs: many(emailConfigs),
  emailTemplates: many(emailTemplates),
  resumes: many(resumes),
  aiConfigs: many(aiConfigs),
  teamMemberships: many(teamMembers),
  ownedTeams: many(teams),
}));

export const resumesRelations = relations(resumes, ({ one }) => ({
  user: one(users, {
    fields: [resumes.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [resumes.teamId],
    references: [teams.id],
  }),
}));

export const emailConfigsRelations = relations(emailConfigs, ({ one }) => ({
  user: one(users, {
    fields: [emailConfigs.userId],
    references: [users.id],
  }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  user: one(users, {
    fields: [emailTemplates.userId],
    references: [users.id],
  }),
}));

export const aiConfigsRelations = relations(aiConfigs, ({ one }) => ({
  user: one(users, {
    fields: [aiConfigs.userId],
    references: [users.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
  }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const teamInvitesRelations = relations(teamInvites, ({ one }) => ({
  team: one(teams, {
    fields: [teamInvites.teamId],
    references: [teams.id],
  }),
  inviter: one(users, {
    fields: [teamInvites.inviterId],
    references: [users.id],
  }),
}));

// 筛选模板表
export const screeningTemplates = sqliteTable(
  "screening_templates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    config: text("config").notNull(),
    isDefault: integer("is_default").default(0).notNull(),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
    updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (screeningTemplates) => ({
    userIdIdx: index("screening_template_user_id_idx").on(
      screeningTemplates.userId,
    ),
  }),
);

// 导出类型
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Resume = typeof resumes.$inferSelect;
export type NewResume = typeof resumes.$inferInsert;
export type EmailConfig = typeof emailConfigs.$inferSelect;
export type NewEmailConfig = typeof emailConfigs.$inferInsert;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;
export type AiConfig = typeof aiConfigs.$inferSelect;
export type NewAiConfig = typeof aiConfigs.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type ScreeningTemplate = typeof screeningTemplates.$inferSelect;
export type NewScreeningTemplate = typeof screeningTemplates.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMemberRecord = typeof teamMembers.$inferSelect;
export type NewTeamMemberRecord = typeof teamMembers.$inferInsert;
export type TeamInvite = typeof teamInvites.$inferSelect;
export type NewTeamInvite = typeof teamInvites.$inferInsert;
