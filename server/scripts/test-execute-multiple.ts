import "../src/loadEnv.js";
import { createClient } from "@libsql/client";

const tursoUrl = process.env.TURSO_DATABASE_URL!.trim();
const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();
const client = createClient({ url: tursoUrl, authToken: tursoToken });

async function main() {
  try {
    // 测试 executeMultiple
    console.log("测试 executeMultiple...");
    await client.executeMultiple("CREATE TABLE t1 (id int); CREATE TABLE t2 (id int);");
    console.log("✓ executeMultiple 成功");
    // 清理
    await client.execute("DROP TABLE t1");
    await client.execute("DROP TABLE t2");
    console.log("✅ executeMultiple 正常");
  } catch (err: any) {
    console.error("❌ 错误:", err.message);
    process.exit(1);
  }
}

main();
