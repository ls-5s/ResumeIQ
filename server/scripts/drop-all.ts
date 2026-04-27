import "../src/loadEnv.js";
import { createClient } from "@libsql/client";

const tursoUrl = process.env.TURSO_DATABASE_URL!.trim();
const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();
const client = createClient({ url: tursoUrl, authToken: tursoToken });

async function main() {
  try {
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    );
    const tableNames = (tables.rows as any[]).map((r) => r.name);
    console.log("现有用户表:", tableNames);

    for (const name of tableNames) {
      await client.batch([`DROP TABLE "${name}"`], "deferred");
      console.log(`  ✓ 删除 ${name}`);
    }

    const remaining = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    );
    console.log("剩余:", (remaining.rows as any[]).map((r) => r.name));
    console.log("✅ 完成");
  } catch (err: any) {
    console.error("❌ 错误:", err.message);
    process.exit(1);
  }
}

main();
