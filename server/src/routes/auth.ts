import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import crypto from 'crypto';

const router: RouterType = Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const CALLBACK_URL = `${APP_URL}/auth/github/callback`;

if (!GITHUB_CLIENT_ID) {
  console.warn('警告: GITHUB_CLIENT_ID 未配置');
}

// 1. 获取 GitHub 授权 URL
router.get('/github/authorize', (_req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString('hex');
  
  // 将 state 存入 cookie 或临时存储（这里简化处理，实际应存服务端 session）
  res.cookie('github_oauth_state', state, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000, // 10分钟
    sameSite: 'lax'
  });

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    scope: 'read:user user:email',
    state,
  });

  res.json({
    code: 200,
    data: {
      url: `https://github.com/login/oauth/authorize?${params.toString()}`
    }
  });
});

export default router;
