-- 团队与成员表迁移（libsql 语法）
-- 执行方式：turso execute <db-url> --token <token> -f drizzle/0003_teams_and_members.sql

-- 团队表
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 团队成员表
CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member',  -- owner | admin | member
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_member_team_id_idx ON team_members(team_id);
CREATE INDEX IF NOT EXISTS team_member_user_id_idx ON team_members(user_id);

-- 团队邀请表
CREATE TABLE IF NOT EXISTS team_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  inviter_id INTEGER NOT NULL REFERENCES users(id),
  invitee_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'member',  -- admin | member
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected | expired
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS team_invite_team_id_idx ON team_invites(team_id);
CREATE INDEX IF NOT EXISTS team_invite_token_idx ON team_invites(token);
CREATE INDEX IF NOT EXISTS team_invite_email_idx ON team_invites(invitee_email);

-- 为 resumes 表添加 team_id 列（如不存在请手动执行）
-- ALTER TABLE resumes ADD COLUMN team_id INTEGER REFERENCES teams(id);
