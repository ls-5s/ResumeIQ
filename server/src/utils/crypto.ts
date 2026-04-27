/**
 * AES-256-CBC 加密/解密工具
 *
 * 算法：AES-256-CBC，每条加密记录使用独立随机 IV（初始向量），
 * IV 拼接在密文前端（16 bytes）→ Base64 编码存储。
 *
 * 密钥来源：process.env.ENCRYPTION_KEY（32 bytes hex 或原始字符串均可）
 * 若未配置，运行时抛出错误，保证不含密钥时不静默降级。
 */

import crypto from "node:crypto";

const ALGORITHM = "aes-256-cbc";
const IV_BYTES = 16;
const KEY_BYTES = 32;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY 环境变量未设置，请在 .env 中配置 32 字符以上的随机字符串");
  }
  // 32 bytes：不足补 0（hex 模式），超过截断
  const key = raw.length === 64
    ? Buffer.from(raw.slice(0, 64), "hex")   // hex 格式
    : Buffer.alloc(KEY_BYTES);
  if (raw.length !== 64) {
    key.write(raw.padEnd(KEY_BYTES, "\0"));
  }
  return key;
}

/**
 * 加密明文，返回 Base64 编码字符串（格式: IV + ciphertext）
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString("base64");
}

/**
 * 解密 Base64 密文，返回明文
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";

  try {
    const key = getKey();
    const data = Buffer.from(ciphertext, "base64");

    // 校验：Base64 解码后长度必须至少为 IV_BYTES (16)
    if (data.length <= IV_BYTES) {
      return "";
    }

    const iv = data.subarray(0, IV_BYTES);
    const encrypted = data.subarray(IV_BYTES);

    // 校验：AES 块对齐（AES-256-CBC 要求密文长度是 16 的倍数）
    if (encrypted.length % IV_BYTES !== 0) {
      return "";
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    // 解密异常时返回空字符串，静默处理
    return "";
  }
}

/**
 * 脱敏显示：保留首尾各 3 位，中间用 *** 替代
 */
export function mask(value: string): string {
  if (!value || value.length <= 6) return "***";
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}
