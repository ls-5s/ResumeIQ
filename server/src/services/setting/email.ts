import { db } from '../../db/index.js';
import { emailConfigs, users } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { EmailConfigInput, EmailConfigResponse } from '../../types/setting.js';
import { encrypt, mask } from '../../utils/crypto';

// 重新导出类型
export type { EmailConfigInput, EmailConfigResponse };

// 将 authCode 脱敏后返回，防止泄露到前端
function sanitizeEmailConfig(config: EmailConfigResponse): EmailConfigResponse {
  return { ...config, authCode: undefined };
}

// 获取用户的邮箱配置列表
export async function getEmailConfigs(userId: number): Promise<EmailConfigResponse[]> {
  const configs = await db
    .select({
      id: emailConfigs.id,
      userId: emailConfigs.userId,
      email: emailConfigs.email,
      authCode: emailConfigs.authCode,
      imapHost: emailConfigs.imapHost,
      imapPort: emailConfigs.imapPort,
      smtpHost: emailConfigs.smtpHost,
      smtpPort: emailConfigs.smtpPort,
      isDefault: emailConfigs.isDefault,
      isDeleted: emailConfigs.isDeleted,
      createdAt: emailConfigs.createdAt,
      updatedAt: emailConfigs.updatedAt,
    })
    .from(emailConfigs)
    .where(and(
      eq(emailConfigs.userId, userId),
      eq(emailConfigs.isDeleted, 0)
    ));

  return configs.map(sanitizeEmailConfig);
}

// 获取单个邮箱配置
export async function getEmailConfigById(userId: number, configId: number): Promise<EmailConfigResponse | null> {
  const [config] = await db
    .select({
      id: emailConfigs.id,
      userId: emailConfigs.userId,
      email: emailConfigs.email,
      authCode: emailConfigs.authCode,
      imapHost: emailConfigs.imapHost,
      imapPort: emailConfigs.imapPort,
      smtpHost: emailConfigs.smtpHost,
      smtpPort: emailConfigs.smtpPort,
      isDefault: emailConfigs.isDefault,
      isDeleted: emailConfigs.isDeleted,
      createdAt: emailConfigs.createdAt,
      updatedAt: emailConfigs.updatedAt,
    })
    .from(emailConfigs)
    .where(and(
      eq(emailConfigs.id, configId),
      eq(emailConfigs.userId, userId),
      eq(emailConfigs.isDeleted, 0)
    ));

  return config ? sanitizeEmailConfig(config) : null;
}

// 创建邮箱配置
export async function createEmailConfig(
  userId: number,
  data: EmailConfigInput
): Promise<EmailConfigResponse> {
  // 如果设为默认邮箱，先取消其他默认邮箱
  if (data.isDefault) {
    await db
      .update(emailConfigs)
      .set({ isDefault: 0 })
      .where(and(
        eq(emailConfigs.userId, userId),
        eq(emailConfigs.isDefault, 1),
        eq(emailConfigs.isDeleted, 0)
      ));
  }

  // 检查邮箱是否已被其他用户使用
  const [existing] = await db
    .select({ id: emailConfigs.id })
    .from(emailConfigs)
    .where(and(
      eq(emailConfigs.email, data.email),
      eq(emailConfigs.isDeleted, 0)
    ));

  if (existing) {
    // 检查是否属于当前用户
    const [ownConfig] = await db
      .select({ id: emailConfigs.id })
      .from(emailConfigs)
      .where(and(
        eq(emailConfigs.email, data.email),
        eq(emailConfigs.userId, userId),
        eq(emailConfigs.isDeleted, 0)
      ));
    
    if (!ownConfig) {
      throw new Error('该邮箱已被其他用户使用');
    }
  }

  const [config] = await db
    .insert(emailConfigs)
    .values({
      userId,
      email: data.email,
      authCode: encrypt(data.authCode),
      imapHost: data.imapHost || 'imap.qq.com',
      imapPort: data.imapPort || 993,
      smtpHost: data.smtpHost || 'smtp.qq.com',
      smtpPort: data.smtpPort || 465,
      isDefault: data.isDefault ? 1 : 0,
      isDeleted: 0,
    })
    .returning();

  return sanitizeEmailConfig(config);
}

// 更新邮箱配置
export async function updateEmailConfig(
  userId: number,
  configId: number,
  data: Partial<EmailConfigInput>
): Promise<EmailConfigResponse> {
  // 检查配置是否存在且属于该用户
  const existing = await getEmailConfigById(userId, configId);
  if (!existing) {
    throw new Error('邮箱配置不存在');
  }

  // 如果设为默认邮箱，先取消其他默认邮箱
  if (data.isDefault) {
    await db
      .update(emailConfigs)
      .set({ isDefault: 0 })
      .where(and(
        eq(emailConfigs.userId, userId),
        eq(emailConfigs.isDefault, 1),
        eq(emailConfigs.isDeleted, 0)
      ));
  }

  // 如果更换邮箱，检查新邮箱是否已被其他用户使用
  if (data.email && data.email !== existing.email) {
    const [conflict] = await db
      .select({ id: emailConfigs.id })
      .from(emailConfigs)
      .where(and(
        eq(emailConfigs.email, data.email),
        eq(emailConfigs.isDeleted, 0)
      ));

    if (conflict) {
      throw new Error('该邮箱已被其他用户使用');
    }
  }

  // 构建更新数据
  const updateData: Record<string, unknown> = {};
  if (data.email !== undefined) updateData.email = data.email;
  // 只有非空字符串才覆盖已存储的授权码，避免空字符串误覆盖；写入前加密
  if (typeof data.authCode === "string" && data.authCode !== "") {
    updateData.authCode = encrypt(data.authCode);
  }
  if (data.imapHost !== undefined) updateData.imapHost = data.imapHost;
  if (data.imapPort !== undefined) updateData.imapPort = data.imapPort;
  if (data.smtpHost !== undefined) updateData.smtpHost = data.smtpHost;
  if (data.smtpPort !== undefined) updateData.smtpPort = data.smtpPort;
  if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

  await db
    .update(emailConfigs)
    .set(updateData)
    .where(and(
      eq(emailConfigs.id, configId),
      eq(emailConfigs.userId, userId)
    ));

  const updated = await getEmailConfigById(userId, configId);
  if (!updated) {
    throw new Error('更新失败');
  }

  return updated;
}

// 删除邮箱配置（软删除）
export async function deleteEmailConfig(userId: number, configId: number): Promise<void> {
  const existing = await getEmailConfigById(userId, configId);
  if (!existing) {
    throw new Error('邮箱配置不存在');
  }

  // 如果删除的是默认邮箱，取消默认状态
  if (existing.isDefault) {
    await db
      .update(emailConfigs)
      .set({ isDefault: 0 })
      .where(and(
        eq(emailConfigs.id, configId),
        eq(emailConfigs.userId, userId)
      ));
  }

  // 软删除
  await db
    .update(emailConfigs)
    .set({ isDeleted: 1 })
    .where(and(
      eq(emailConfigs.id, configId),
      eq(emailConfigs.userId, userId)
    ));
}

// 验证邮箱配置（测试连接）
export async function testEmailConfig(
  userId: number,
  configId: number
): Promise<{ success: boolean; message: string }> {
  const config = await getEmailConfigById(userId, configId);
  if (!config) {
    return { success: false, message: '邮箱配置不存在' };
  }

  // 这里可以添加实际的 IMAP/SMTP 连接测试
  // 目前只做基础验证
  try {
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(config.email)) {
      return { success: false, message: '邮箱格式不正确' };
    }

    // 验证端口范围
    if (!config.imapPort || config.imapPort < 1 || config.imapPort > 65535) {
      return { success: false, message: 'IMAP 端口无效' };
    }
    if (!config.smtpPort || config.smtpPort < 1 || config.smtpPort > 65535) {
      return { success: false, message: 'SMTP 端口无效' };
    }

    return { success: true, message: '配置验证通过' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '验证失败'
    };
  }
}
