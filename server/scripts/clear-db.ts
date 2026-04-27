import "../src/loadEnv.js";
import { createClient } from "@libsql/client";

const tursoUrl = process.env.TURSO_DATABASE_URL!.trim();
const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();
const client = createClient({ url: tursoUrl, authToken: tursoToken });

async function main() {
  try {
    // 获取所有用户表（排除 sqlite 系统表）
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    const tableNames = (tables.rows as any[]).map((r) => r.name);

    if (tableNames.length === 0) {
      console.log("没有用户表需要清理");
      return;
    }

    console.log("删除表:", tableNames);

    // 逐条 DROP TABLE（batch 需逐条）
    for (const name of tableNames) {
      try {
        await client.execute(`DROP TABLE "${name}"`);
        console.log(`  ✓ 删除 ${name}`);
      } catch (err: any) {
        console.log(`  ⊘ ${name}: ${err.message.split("\n")[0]}`);
      }
    }

    // 验证
    const remaining = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    );
    console.log("\n剩余表:", (remaining.rows as any[]).map((r) => r.name));
    console.log("✅ 清理完成");
  } catch (err: any) {
    console.error("❌ 错误:", err.message);
    process.exit(1);
  }
}

main();
