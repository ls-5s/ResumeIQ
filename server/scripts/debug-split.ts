import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(resolve(__dirname, "../drizzle/0002_freezing_centennial.sql"), "utf8");

const stmts = sql.split(/;-->\s*statement-breakpoint/);
console.log(`共 ${stmts.length} 段:`);
stmts.forEach((s, i) => {
  const cleaned = s.replace(/--[^\n]*/g, "").trim();
  console.log(`\n[${i}] 原始(${s.length}B) -> 清理后(${cleaned.length}B):`);
  console.log(cleaned.slice(0, 120));
  if (cleaned.length > 120) console.log("...");
});
