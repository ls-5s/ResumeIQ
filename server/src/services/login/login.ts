import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../db/index.js';

interface LoginParams {
  email: string;
  password: string;
}

interface LoginResult {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  token: string;
  refreshToken: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-key';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '30d';

// 定义 StringValue 类型（来自 ms 包）
type StringValue = `${number}` | `${number}${string}` | `${number} ${string}`;

// 生成 Token
function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as StringValue });
}

// 生成 Refresh Token
function generateRefreshToken(payload: object): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

// 验证 Refresh Token
export function verifyRefreshToken(token: string): any {
  return jwt.verify(token, REFRESH_SECRET);
}

// 刷新 Token
export function refreshToken(refreshToken: string): { token: string; refreshToken: string } {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const newToken = generateToken({ id: decoded.id, email: decoded.email, username: decoded.username });
    const newRefreshToken = generateRefreshToken({ id: decoded.id, email: decoded.email, username: decoded.username });
    return { token: newToken, refreshToken: newRefreshToken };
  } catch {
    throw new Error('Refresh token 无效或已过期');
  }
}

export async function loginUser({ email, password }: LoginParams): Promise<LoginResult> {
  // 1. 查找用户
  const [user] = await db.select({
    id: users.id,
    username: users.username,
    email: users.email,
    password: users.password,
    avatar: users.avatar,
  }).from(users).where(eq(users.email, email));
  
  if (!user) {
    throw new Error('邮箱或密码错误');
  }

  // 2. 验证密码
  const isValid = await bcrypt.compare(password, user.password);
  
  if (!isValid) {
    throw new Error('邮箱或密码错误');
  }

  // 3. 生成 JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as StringValue }
  );

  // 4. 生成 Refresh Token
  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );

  // 5. 返回用户信息（不含密码）
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    token,
    refreshToken,
  };
}
