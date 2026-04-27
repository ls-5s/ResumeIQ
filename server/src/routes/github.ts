import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router: RouterType = Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-key';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '30d';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

interface GithubUserInfo {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

// axios 实例配置代理
const githubClient = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'AI-Resume-Screening',
    Accept: 'application/vnd.github.v3+json',
  },
});

// 如果配置了代理，使用代理
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxyUrl) {
  const proxyParts = proxyUrl.replace(/^https?:\/\//, '').split(':');
  githubClient.defaults.proxy = {
    host: proxyParts[0],
    port: parseInt(proxyParts[1] || '8080'),
    protocol: proxyUrl.startsWith('https') ? 'https' : 'http',
  };
}

// 生成 JWT
function generateTokens(user: { id: number; email: string; username: string }) {
  const token = jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as `${number}` }
  );
  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
  return { token, refreshToken };
}

// 查找或创建 GitHub 用户
async function findOrCreateGithubUser(githubUser: GithubUserInfo) {
  let [existingUser] = await db.select().from(users).where(eq(users.githubId, String(githubUser.id)));
  
  if (existingUser) {
    await db.update(users)
      .set({ 
        avatar: githubUser.avatar_url,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, existingUser.id));
    return existingUser;
  }

  if (githubUser.email) {
    [existingUser] = await db.select().from(users).where(eq(users.email, githubUser.email));
    
    if (existingUser) {
      await db.update(users)
        .set({ 
          githubId: String(githubUser.id),
          githubUsername: githubUser.login,
          avatar: githubUser.avatar_url,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, existingUser.id));
      return { ...existingUser, githubId: String(githubUser.id) };
    }
  }

  const username = githubUser.name || githubUser.login;
  const email = githubUser.email || `github_${githubUser.id}@placeholder.com`;
  const tempPassword = crypto.randomBytes(16).toString('hex');
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const [newUser] = await db.insert(users).values({
    username,
    email,
    password: hashedPassword,
    avatar: githubUser.avatar_url,
    githubId: String(githubUser.id),
    githubUsername: githubUser.login,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).returning();

  return newUser;
}

// 获取 GitHub 授权 URL
router.get('/github/authorize', (_req: Request, res: Response) => {
  const state = Math.random().toString(36).substring(2, 18);
  
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${APP_URL}/auth/github/callback`,
    scope: 'read:user user:email',
    state,
  });

  res.json({
    code: 200,
    data: {
      url: `https://github.com/login/oauth/authorize?${params.toString()}`,
      state,
    }
  });
});

// GitHub 登录
router.post('/github/register', async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      code: 400,
      message: '缺少授权码'
    });
  }

  console.log('[GitHub] 收到授权码:', code.substring(0, 10) + '...');

  try {
    // 1. 用 code 换取 access_token
    console.log('[GitHub] 正在用授权码换取 access_token...');
    const tokenResponse = await githubClient.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${APP_URL}/auth/github/callback`,
      },
      { headers: { Accept: 'application/json' } }
    );

    const tokenData = tokenResponse.data;
    console.log('[GitHub] Token 响应:', JSON.stringify(tokenData));
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;
    console.log('[GitHub] 获取 access_token 成功');

    // GitHub API 请求头（2024年起必须包含版本声明）
    const githubApiHeaders = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // 2. 获取 GitHub 用户信息
    const userResponse = await githubClient.get('https://api.github.com/user', {
      headers: githubApiHeaders,
    });

    const githubUser: GithubUserInfo = userResponse.data;

    // 3. 尝试获取邮箱
    if (!githubUser.email) {
      try {
        const emailResponse = await githubClient.get('https://api.github.com/user/emails', {
          headers: githubApiHeaders,
        });
        
        if (emailResponse.status === 200) {
          const emails: Array<{ email: string; primary: boolean; verified: boolean }> = emailResponse.data;
          const primaryEmail = emails.find(e => e.primary && e.verified) || emails.find(e => e.verified);
          if (primaryEmail) {
            githubUser.email = primaryEmail.email;
          }
        }
      } catch {
        console.warn('获取 GitHub 邮箱失败');
      }
    }

    // 4. 查找或创建用户
    const user = await findOrCreateGithubUser(githubUser);

    // 5. 生成 JWT
    const { token, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    res.json({
      code: 200,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        token,
        refreshToken,
      },
    });

  } catch (error: any) {
    console.error('GitHub 登录失败:', error.message);
    
    // 判断是否是网络问题
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      res.status(503).json({
        code: 503,
        message: '无法连接 GitHub，请检查网络或配置代理',
      });
    } else {
      res.status(400).json({
        code: 400,
        message: error.response?.data?.message || error.message || 'GitHub 登录失败',
      });
    }
  }
});

export default router;
