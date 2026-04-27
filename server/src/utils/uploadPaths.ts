import fs from "fs";
import os from "os";
import path from "path";

function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY,
  );
}

/**
 * 上传根目录：本地为 cwd/uploads；Serverless 为 /tmp 下路径（/var/task 只读无法 mkdir）
 */
export function getUploadsRoot(): string {
  const explicit = process.env.UPLOAD_DIR?.trim();
  if (explicit) {
    return path.resolve(explicit);
  }
  if (isServerlessRuntime()) {
    return path.join(os.tmpdir(), "ai-resume-screening", "uploads");
  }
  return path.join(process.cwd(), "uploads");
}

export function getResumeUploadDir(): string {
  return path.join(getUploadsRoot(), "resumes");
}

export function ensureResumeUploadDir(): void {
  const dir = getResumeUploadDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
