-- 筛选模板表
CREATE TABLE IF NOT EXISTS `screening_templates` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL COMMENT '模板名称',
  `config` LONGTEXT NOT NULL COMMENT '预筛选配置（JSON 字符串）',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否为默认模板',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX `screening_template_user_id_idx` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='筛选模板表';
