-- 活动日志表
CREATE TABLE IF NOT EXISTS `activities` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `type` VARCHAR(50) NOT NULL COMMENT '活动类型: upload(上传简历), screening(AI筛选), pass(通过筛选), reject(拒绝), interview(发送面试邀请)',
  `resume_id` INT DEFAULT NULL COMMENT '关联的简历ID',
  `resume_name` VARCHAR(255) DEFAULT NULL COMMENT '简历名称（冗余存储）',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '活动描述',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX `activity_user_id_idx` (`user_id`),
  INDEX `activity_created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动日志表';
