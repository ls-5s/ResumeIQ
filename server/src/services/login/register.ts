import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { asc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

interface RegisterParams {
  username: string;
  email: string;
  password: string;
}

interface RegisterResult {
  id: number;
  username: string;
  email: string;
  token: string;
}

export async function registerUser({ username, email, password }: RegisterParams): Promise<RegisterResult> {
  // 1. 检查邮箱是否已存在
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  
  if (existing) {
    throw new Error('邮箱已被注册');
  }

  // 2. 加密密码
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. 插入用户
  const result = await db.insert(users).values({
    username,
    email,
    password: hashedPassword,
  });

  // 获取刚插入的用户ID（MySQL 使用 lastInsertId）
  const [newUser] = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .orderBy(asc(users.id))
    .limit(1);

  // 4. 返回结果
  return {
    id: newUser.id,
    username,
    email,
    token: '',
  };
}
