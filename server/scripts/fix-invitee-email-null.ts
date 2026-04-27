// 重建 team_invites 表，移除 invitee_email 的 NOT NULL 约束
// 使用方法: npx tsx scripts/fix-invitee-email-null.ts

import { createClient } from "@libsql/client";

const TURSO_DATABASE_URL = "libsql://ai-resume-db-ls-5s.aws-us-east-1.turso.io";
const TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQ1MTgwMjgsImlkIjoiMDE5ZDI5ODItOWQwMS03N2M3LWFmOGMtZjIwYjIwYzY1NWVjIiwicmlkIjoiMjY1ZTcxYTctMDhlOC00MGQ2LTgzZGQtMWY0YzM3NzZkM2E1In0.B_fFln0WF94QmxpL5LVU_YIcGqNQERyolD0khjLGgzsU2rca1VHCiVHkSfA80UxNTMmIGNUQgBvAckI86xzCAQ";

const client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

async function fixTable() {
  console.log("开始重建 team_invites 表...");
  
  // 1. 创建临时表（invitee_email 可为 NULL）
  console.log("创建临时表...");
  await client.execute(`
    CREATE TABLE team_invites_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      team_id INTEGER NOT NULL,
      inviter_id INTEGER NOT NULL,
      invitee_email TEXT,
      token TEXT NOT NULL,
      role TEXT DEFAULT 'member' NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      applicant_id INTEGER,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);
  
  // 2. 复制数据
  console.log("复制数据...");
  await client.execute(`
    INSERT INTO team_invites_new (id, team_id, inviter_id, invitee_email, token, role, status, applicant_id, expires_at, created_at)
    SELECT id, team_id, inviter_id, NULL as invitee_email, token, role, status, applicant_id, expires_at, created_at
    FROM team_invites
  `);
  
  // 3. 删除旧表
  console.log("删除旧表...");
  await client.execute("DROP TABLE team_invites");
  
  // 4. 重命名新表
  console.log("重命名新表...");
  await client.execute("ALTER TABLE team_invites_new RENAME TO team_invites");
  
  // 5. 重建索引
  console.log("重建索引...");
  await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS team_invite_token_unique ON team_invites(token)");
  await client.execute("CREATE INDEX IF NOT EXISTS team_invite_team_id_idx ON team_invites(team_id)");
  await client.execute("CREATE INDEX IF NOT EXISTS team_invite_token_idx ON team_invites(token)");
  await client.execute("CREATE INDEX IF NOT EXISTS team_invite_email_idx ON team_invites(invitee_email)");
  await client.execute("CREATE INDEX IF NOT EXISTS team_invite_applicant_idx ON team_invites(applicant_id)");
  
  // 6. 验证最终表结构
  console.log("验证最终表结构...");
  const tableInfo = await client.execute("PRAGMA table_info(team_invites)");
  console.log("最终表结构:");
  tableInfo.rows.forEach((row: any) => {
    console.log(`  ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : 'NULL'} ${row.dflt_value ? 'DEFAULT ' + row.dflt_value : ''}`);
  });
  
  console.log("完成!");
  process.exit(0);
}

fixTable().catch((err) => {
  console.error("失败:", err);
  process.exit(1);
});
