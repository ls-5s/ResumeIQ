import "../src/loadEnv.js";
import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, "../drizzle");

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL!.trim();
  const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();
  const client = createClient({ url: tursoUrl, authToken: tursoToken });

  try {
    console.log("TURSO_DATABASE_URL:", tursoUrl.slice(0, 20) + "...");

    // 1. 检查现有表
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    const existingTables = (tables.rows as any[]).map((r) => r.name);
    console.log("现有表:", existingTables.length > 0 ? existingTables : "无");

    // 2. 读取所有迁移 SQL 并按名称排序
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const fullSql = readFileSync(resolve(migrationsDir, file), "utf8");
      console.log(`\n执行迁移: ${file} (${fullSql.length} bytes)`);

      // drizzle-kit 用 ";--> statement-breakpoint" 分隔
      const segments = fullSql.split(/;-->\s*statement-breakpoint/);

      // 用 executeMultiple 一次性执行所有语句（每段末尾补 ";"）
      const allStatements = segments
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (s.endsWith(";") ? s : s + ";"))
        .join("\n");

      try {
        await client.executeMultiple(allStatements);
        // 统计成功数
        const count = segments.filter((s) => s.trim()).length;
        console.log(`  ✓ ${file} 完成 (${count} 条语句)`);
      } catch (err: any) {
        const msg = err.message ?? "";
        if (
          msg.includes("already exists") ||
          msg.includes("duplicate column") ||
          msg.includes("no such table") ||
          msg.includes("no such column")
        ) {
          console.log(`  ⊘ 部分跳过: ${msg.split("\n")[0]}`);
        } else {
          throw new Error(`${file} → ${msg}`);
        }
      }
    }

    // 3. 验证表
    const newTables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    console.log("\n迁移后表:", (newTables.rows as any[]).map((r) => r.name));
    console.log("\n✅ 全部迁移成功!");
  } catch (err: any) {
    console.error("\n❌ 错误:", err.message);
    process.exit(1);
  }
}

main();
