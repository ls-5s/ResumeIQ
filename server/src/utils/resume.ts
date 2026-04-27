import path from 'path';
import multer, { FileFilterCallback } from 'multer';
import express from 'express';
import { ensureResumeUploadDir, getResumeUploadDir } from './uploadPaths.js';

/**
 * 从解析内容中提取姓名、邮箱和电话
 */
export function extractContactInfo(content: string): { name: string; email: string; phone: string } {
  let name = '';
  let email = '';
  let phone = '';

  // 提取邮箱
  const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    email = emailMatch[0];
  }

  // 提取电话 - 匹配各种格式的电话号码
  const phoneMatch = content.match(/1[3-9]\d{9,10}/);
  if (phoneMatch) {
    phone = phoneMatch[0];
  }

  // 提取姓名 - 通常在文件开头的前几行
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    // 第一行通常是姓名
    const firstLine = lines[0].trim();
    // 检查第一行是否像名字（不包含特殊字符，长度2-20个字符）
    if (/^[\u4e00-\u9fa5]{2,20}$/.test(firstLine) || /^[a-zA-Z\s]{2,20}$/.test(firstLine)) {
      name = firstLine;
    }
  }

  return { name, email, phone };
}

// 配置 multer 存储（目录在每次写入前创建，避免 Serverless 在 import 阶段 mkdir 失败）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      ensureResumeUploadDir();
      cb(null, getResumeUploadDir());
    } catch (err) {
      cb(err as Error, getResumeUploadDir());
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req: express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = ['.pdf', '.docx', '.doc'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 PDF、Word 文档上传'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 限制
  }
});
