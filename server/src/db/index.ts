import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL?.trim();
const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();

// 优先使用 DATABASE_URL（支持本地 SQLite），其次使用 Turso
const dbUrl = databaseUrl || tursoUrl;

if (!dbUrl) {
  throw new Error(
    "DATABASE_URL 未配置。请在 .env 中添加 DATABASE_URL（本地 SQLite）或 TURSO_DATABASE_URL（Turso 云数据库）。",
  );
}

const client = createClient({
  url: dbUrl,
  authToken: databaseUrl ? undefined : tursoToken, // SQLite 不需要 token
});

export const db = drizzle(client, { schema });

export async function testConnection(): Promise<boolean> {
  try {
    await client.execute("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

/**
 * 启动时自动创建 teams / team_members 表（如不存在）。
 * 只在本地开发模式执行，生产由 drizzle-kit push 管理。
 */
export async function ensureTables(): Promise<void> {
  // 仅本地 tsx 开发时需要自动建表
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) return;

  const migrations = [
    // users 表（其他表都依赖它）
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      avatar TEXT,
      github_id TEXT UNIQUE,
      github_username TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    // teams 表（需放在 resumes 前，因为 resumes.team_id 引用它）
    `CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      owner_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, user_id)
    )`,
    `CREATE INDEX IF NOT EXISTS team_member_team_id_idx ON team_members(team_id)`,
    `CREATE INDEX IF NOT EXISTS team_member_user_id_idx ON team_members(user_id)`,
    // resumes 表
    `CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      team_id INTEGER REFERENCES teams(id),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      resume_file TEXT,
      original_file_name TEXT,
      file_type TEXT,
      file_size INTEGER,
      summary TEXT,
      parsed_content TEXT,
      score INTEGER,
      dimension_scores TEXT,
      status TEXT DEFAULT 'pending' NOT NULL,
      last_email_sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS resume_user_id_idx ON resumes(user_id)`,
    `CREATE INDEX IF NOT EXISTS resume_email_idx ON resumes(email)`,
    // email_configs 表
    `CREATE TABLE IF NOT EXISTS email_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      email TEXT NOT NULL,
      auth_code TEXT NOT NULL,
      imap_host TEXT DEFAULT 'imap.qq.com',
      imap_port INTEGER DEFAULT 993,
      smtp_host TEXT DEFAULT 'smtp.qq.com',
      smtp_port INTEGER DEFAULT 465,
      is_default INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    // email_templates 表
    `CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS email_template_user_id_idx ON email_templates(user_id)`,
    // ai_configs 表
    `CREATE TABLE IF NOT EXISTS ai_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL DEFAULT '默认配置',
      model TEXT NOT NULL DEFAULT 'gpt-4o',
      api_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
      api_key TEXT,
      prompt TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS ai_config_user_id_idx ON ai_configs(user_id)`,
    // activities 表
    `CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      resume_id INTEGER,
      resume_name TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS activity_user_id_idx ON activities(user_id)`,
    `CREATE INDEX IF NOT EXISTS activity_created_at_idx ON activities(created_at)`,
    // screening_templates 表
    `CREATE TABLE IF NOT EXISTS screening_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      config TEXT NOT NULL,
      is_default INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS screening_template_user_id_idx ON screening_templates(user_id)`,
    // 团队邀请表
    `CREATE TABLE IF NOT EXISTS team_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      inviter_id INTEGER NOT NULL REFERENCES users(id),
      invitee_email TEXT,
      token TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'pending',
      applicant_id INTEGER REFERENCES users(id),
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS team_invite_team_id_idx ON team_invites(team_id)`,
    `CREATE INDEX IF NOT EXISTS team_invite_token_idx ON team_invites(token)`,
    `CREATE INDEX IF NOT EXISTS team_invite_email_idx ON team_invites(invitee_email)`,
  ];

  for (const sql of migrations) {
    try {
      await client.execute(sql);
    } catch (err: unknown) {
      // 忽略 "table already exists" / "no such column" 等非致命错误
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("already exists") ||
        msg.includes("no such column") ||
        msg.includes("duplicate column")
      ) {
        continue;
      }
      console.warn("[ensureTables] 迁移警告:", msg);
    }
  }
}

export { client };
