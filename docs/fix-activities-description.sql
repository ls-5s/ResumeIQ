-- 修复 activities.description 字段长度问题
-- 执行此 SQL 以支持存储完整的 AI 评估结果

ALTER TABLE activities MODIFY COLUMN description LONGTEXT;
