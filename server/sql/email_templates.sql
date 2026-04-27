-- 邮件模板表
-- 请在MySQL中执行此SQL创建表

CREATE TABLE IF NOT EXISTS `email_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `subject` varchar(500) NOT NULL,
  `body` longtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `email_template_user_id_idx` (`user_id`),
  CONSTRAINT `email_templates_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 为 email_configs 添加外键约束（如果还没有的话）
-- ALTER TABLE `email_configs` 
--   ADD CONSTRAINT `email_configs_user_id_users_id_fk` 
--   FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 为 users 表添加 email 索引（如果还没有的话）
-- ALTER TABLE `users` ADD INDEX `email_idx` (`email`);
