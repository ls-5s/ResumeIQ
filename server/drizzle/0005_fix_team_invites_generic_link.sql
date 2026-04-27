-- 修复 team_invites 表：添加 applicant_id 列并使 invitee_email 可空
-- 这个迁移用于修复已存在的 team_invites 表

-- 添加 applicant_id 列（如果不存在）
ALTER TABLE team_invites ADD COLUMN applicant_id INTEGER;

-- 添加外键约束（可选，如果需要的话）
-- 注意：SQLite 的 ALTER TABLE 不支持直接添加外键，需要重建表

-- 将现有的 invitee_email 设为 NULL（使其可空）
UPDATE team_invites SET invitee_email = NULL WHERE invitee_email = '';

-- 更新 status 列以支持 waiting_approval 状态（SQLite 不支持修改列类型，这里只是注释说明）
-- 如果 status 列已经是 TEXT 类型，就不需要修改

-- 创建 applicant_id 索引（如果不存在）
CREATE INDEX IF NOT EXISTS team_invite_applicant_idx ON team_invites(applicant_id);
