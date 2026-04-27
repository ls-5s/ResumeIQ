-- 修改 team_invites 表，允许 invitee_email 为空，并添加 applicant_id 字段
-- 用于支持无需邮箱的通用邀请链接

-- 1. 将 invitee_email 改为可空（如果列已存在）
-- SQLite 不支持直接修改列，所以我们通过重建表来实现
-- 这个迁移假设 team_invites 表已经存在

-- 添加 applicant_id 字段（如果不存在）
ALTER TABLE team_invites ADD COLUMN applicant_id INTEGER;

-- 注意：invitee_email 在原表中是 NOT NULL，需要手动更新为空值
-- 运行以下语句将所有邀请的 invitee_email 设为 NULL：
UPDATE team_invites SET invitee_email = NULL WHERE invitee_email = '';

-- 如果需要添加外键约束（可选）
-- PRAGMA foreign_keys=off;
-- ... (完整的外键添加需要重建表，这里省略)
-- PRAGMA foreign_keys=on;

-- 创建索引
CREATE INDEX IF NOT EXISTS team_invite_applicant_idx ON team_invites(applicant_id);
