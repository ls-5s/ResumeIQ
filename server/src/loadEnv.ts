/**
 * 本文件仅用于本地开发（`pnpm dev` / `tsx` 运行时）。
 *
 * 在 Vercel 生产环境，dotenv 无法访问文件系统，因此本文件不应被
 * `src/db/index.ts` 或任何 `src/` 内的模块引用。
 *
 * 正确做法：在 Vercel Dashboard 中配置环境变量
 *   https://vercel.com/YOUR_PROJECT/settings/environment-variables
 *
 * 本地开发时，`scripts/*.ts` 等脚本工具可酌情引用此文件。
 */
import { config } from "dotenv";
import { resolve } from "node:path";

// 从 server/ 目录加载 .env（无论构建目标为何）
config({ path: resolve(process.cwd(), ".env") });
