import { Request, Response, NextFunction } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// 导出邮件模板相关类型
export * from './email-template.js';
export * from './setting.js';