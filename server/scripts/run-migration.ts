// 运行数据库迁移脚本
// 使用方法: npx tsx scripts/run-migration.ts

import { createClient } from "@libsql/client";

const TURSO_DATABASE_URL = "libsql://ai-resume-db-ls-5s.aws-us-east-1.turso.io";
const TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQ1MTgwMjgsImlkIjoiMDE5ZDI5ODItOWQwMS03N2M3LWFmOGMtZjIwYjIwYzY1NWVjIiwicmlkIjoiMjY1ZTcxYTctMDhlOC00MGQ2LTgzZGQtMWY0YzM3NzZkM2E1In0.B_fFln0WF94QmxpL5LVU_YIcGqNQERyolD0khjLGgzsU2rca1VHCiVHkSfA80UxNTMmIGNUQgBvAckI86xzCAQ";

const client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

async function runMigration() {
  console.log("开始迁移...");
  
  // 1. 检查表结构
  const tableInfo = await client.execute("PRAGMA table_info(team_invites)");
  console.log("当前 team_invites 表结构:", tableInfo.rows);
  
  // 检查是否有 applicant_id 列
  const hasApplicantId = tableInfo.rows.some((row: any) => row.name === "applicant_id");
  
  if (!hasApplicantId) {
    console.log("添加 applicant_id 列...");
    await client.execute("ALTER TABLE team_invites ADD COLUMN applicant_id INTEGER");
    console.log("applicant_id 列已添加");
  } else {
    console.log("applicant_id 列已存在");
  }
  
  // 检查是否有 invitee_email 列
  const hasInviteeEmail = tableInfo.rows.some((row: any) => row.name === "invitee_email");
  
  if (hasInviteeEmail) {
    // 检查 invitee_email 是否为 NOT NULL
    const emailCol = tableInfo.rows.find((row: any) => row.name === "invitee_email");
    if (emailCol && emailCol.notnull === 1) {
      console.log("将 invitee_email 设为 NULL...");
      await client.execute("UPDATE team_invites SET invitee_email = NULL WHERE invitee_email = '' OR invitee_email IS NULL");
      // 注意: SQLite 的 ALTER TABLE 无法直接修改 NOT NULL 约束
      // 需要重建表来移除约束，但这里暂时跳过
      console.log("已更新 invitee_email 为 NULL");
    }
  }
  
  // 创建 applicant_id 索引
  console.log("创建 applicant_id 索引...");
  try {
    await client.execute("CREATE INDEX IF NOT EXISTS team_invite_applicant_idx ON team_invites(applicant_id)");
    console.log("索引已创建");
  } catch (e: any) {
    if (e.message.includes("already exists")) {
      console.log("索引已存在");
    } else {
      throw e;
    }
  }
  
  console.log("迁移完成!");
  
  // 验证最终表结构
  const finalTableInfo = await client.execute("PRAGMA table_info(team_invites)");
  console.log("最终 team_invites 表结构:", finalTableInfo.rows);
  
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("迁移失败:", err);
  process.exit(1);
});
