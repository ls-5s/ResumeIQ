/**
 * 仅补齐 resumes.dimension_scores，避免使用 drizzle-kit push 带来的整库对齐风险。
 */
import "dotenv/config";
import { pool } from "../src/db/index";

const MYSQL_DUP_FIELDNAME = 1060;

async function main(): Promise<void> {
  try {
    await pool.execute(
      "ALTER TABLE `resumes` ADD COLUMN `dimension_scores` TEXT NULL",
    );
    console.log("已添加列 dimension_scores");
  } catch (e: unknown) {
    const err = e as { errno?: number; code?: string };
    if (err.errno === MYSQL_DUP_FIELDNAME || err.code === "ER_DUP_FIELDNAME") {
      console.log("列 dimension_scores 已存在，跳过");
      return;
    }
    throw e;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
