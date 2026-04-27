import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router: RouterType = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-key';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '30d';

interface GithubUserInfo {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
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
  // 1. 先通过 githubId 查找
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

  // 2. 通过 email 查找（用户可能已用邮箱注册过）
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

  // 3. 创建新用户
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

// GitHub 用户登录/注册
router.post('/github/login', async (req: Request, res: Response) => {
  const { githubUser } = req.body;

  if (!githubUser) {
    return res.status(400).json({
      code: 400,
      message: '缺少 GitHub 用户信息'
    });
  }

  try {
    const user = await findOrCreateGithubUser(githubUser);

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

  } catch (error) {
    console.error('GitHub 用户处理失败:', error);
    res.status(400).json({
      code: 400,
      message: error instanceof Error ? error.message : 'GitHub 用户处理失败',
    });
  }
});

export default router;
