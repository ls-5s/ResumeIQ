import "../src/loadEnv.js";
import { db, client } from "../src/db/index.js";

async function main() {
  try {
    console.log("TURSO_DATABASE_URL:", process.env.TURSO_DATABASE_URL?.slice(0, 20) + "...");
    console.log("TURSO_AUTH_TOKEN:", process.env.TURSO_AUTH_TOKEN?.slice(0, 10) + "...");

    // 查询现有表
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    console.log("\n现有表:", JSON.stringify(tables.rows, null, 2));

    // 测试连接
    const ping = await client.execute("SELECT 1 as ok");
    console.log("\nPing 结果:", ping.rows);
  } catch (err) {
    console.error("错误:", err.message);
    process.exit(1);
  }
}

main();
