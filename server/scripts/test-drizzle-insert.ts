import "../src/loadEnv.js";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { eq } from "drizzle-orm";

const c = createClient({
  url: process.env.TURSO_DATABASE_URL!.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
});
const db = drizzle(c);

const t = sqliteTable("test_drizzle", {
  id: integer("id").primaryKey(),
  n: text("n"),
});

async function main() {
  try {
    // 创建测试表
    await c.execute(
      "CREATE TABLE IF NOT EXISTS test_drizzle (id integer PRIMARY KEY AUTOINCREMENT, n text NOT NULL)",
    );

    // 测试 returning().execute()
    const [r] = await db.insert(t).values({ n: "hello" }).returning({ id: t.id });
    console.log("returning result:", r, "id type:", typeof r.id);

    // 验证查询
    const [row] = await db.select().from(t).where(eq(t.id, r.id));
    console.log("queried row:", row);

    // 清理
    await c.execute("DROP TABLE test_drizzle");
    console.log("✅ returning() 正常");
  } catch (e: any) {
    console.error("❌ 错误:", e.message);
    process.exit(1);
  }
}

main();
