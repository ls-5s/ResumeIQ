-- 为简历表增加 AI 分项分存储（JSON 字符串）
ALTER TABLE `resumes` ADD COLUMN `dimension_scores` TEXT NULL;
