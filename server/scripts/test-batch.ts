import "../src/loadEnv.js";
import { createClient } from "@libsql/client";

const tursoUrl = process.env.TURSO_DATABASE_URL!.trim();
const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();
const client = createClient({ url: tursoUrl, authToken: tursoToken });

async function main() {
  try {
    console.log("测试 batch CREATE TABLE...");
    await client.batch(
      ["CREATE TABLE test_batch (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, name text NOT NULL, created_at text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL)"],
      "deferred",
    );
    console.log("✓ batch CREATE TABLE 成功");

    // 验证表存在
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log("当前表:", (tables.rows as any[]).map((r) => r.name));

    // 清理
    await client.execute("DROP TABLE test_batch");
    console.log("✅ batch CREATE TABLE 正常");
  } catch (err: any) {
    console.error("❌ 错误:", err.message);
    process.exit(1);
  }
}

main();
