-- Turso (libSQL) 建表 SQL
-- 复制以下内容到 Turso 控制台 Console 执行

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  avatar TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 简历表
CREATE TABLE IF NOT EXISTS resumes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS resume_user_id_idx ON resumes(user_id);
CREATE INDEX IF NOT EXISTS resume_email_idx ON resumes(email);

-- 邮箱配置表
CREATE TABLE IF NOT EXISTS email_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  auth_code TEXT NOT NULL,
  imap_host TEXT DEFAULT 'imap.qq.com',
  imap_port INTEGER DEFAULT 993,
  smtp_host TEXT DEFAULT 'smtp.qq.com',
  smtp_port INTEGER DEFAULT 465,
  is_default INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 邮件模板表
CREATE TABLE IF NOT EXISTS email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS email_template_user_id_idx ON email_templates(user_id);

-- AI 配置表
CREATE TABLE IF NOT EXISTS ai_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL DEFAULT '默认配置',
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  api_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
  api_key TEXT,
  prompt TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS ai_config_user_id_idx ON ai_configs(user_id);

-- 活动日志表
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  resume_id INTEGER,
  resume_name TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS activity_user_id_idx ON activities(user_id);
CREATE INDEX IF NOT EXISTS activity_created_at_idx ON activities(created_at);

-- 筛选模板表
CREATE TABLE IF NOT EXISTS screening_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  config TEXT NOT NULL,
  is_default INTEGER DEFAULT 0 NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS screening_template_user_id_idx ON screening_templates(user_id);
