-- 为简历表增加「最近邮件发送成功时间」，执行一次即可（MySQL）
ALTER TABLE `resumes`
  ADD COLUMN `last_email_sent_at` TIMESTAMP NULL DEFAULT NULL
  COMMENT '最近一次群发邮件发送成功时间'
  AFTER `status`;
