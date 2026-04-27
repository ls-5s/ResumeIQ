import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

interface Profile {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

// 获取用户信息
export async function getProfile(userId: number): Promise<Profile> {
  const [user] = await db.select({
    id: users.id,
    username: users.username,
    email: users.email,
    avatar: users.avatar,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  }).from(users).where(eq(users.id, userId));

  if (!user) {
    throw new Error('用户不存在');
  }

  return user;
}

// 更新用户信息
export async function updateProfile(
  userId: number,
  data: { username?: string; avatar?: string }
): Promise<Profile> {
  // 如果要修改用户名，检查用户名是否已被其他用户使用
  if (data.username) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, data.username));

    if (existing && existing.id !== userId) {
      throw new Error('用户名已被使用');
    }
  }

  // 更新用户信息
  await db
    .update(users)
    .set({
      username: data.username,
      avatar: data.avatar,
    })
    .where(eq(users.id, userId));

  // MySQL 不支持 returning，重新查询获取更新后的数据
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      avatar: users.avatar,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    throw new Error('用户不存在');
  }

  return user;
}
