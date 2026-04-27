// 修复团队成员表，确保所有 owner 都在 team_members 中
// 使用方法: npx tsx scripts/sync-team-owners.ts

import { createClient } from "@libsql/client";

const TURSO_DATABASE_URL = "libsql://ai-resume-db-ls-5s.aws-us-east-1.turso.io";
const TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQ1MTgwMjgsImlkIjoiMDE5ZDI5ODItOWQwMS03N2M3LWFmOGMtZjIwYjIwYzY1NWVjIiwicmlkIjoiMjY1ZTcxYTctMDhlOC00MGQ2LTgzZGQtMWY0YzM3NzZkM2E1In0.B_fFln0WF94QmxpL5LVU_YIcGqNQERyolD0khjLGgzsU2rca1VHCiVHkSfA80UxNTMmIGNUQgBvAckI86xzCAQ";

const client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

async function syncTeamOwners() {
  console.log("开始同步团队所有者...");

  // 获取所有团队及其所有者
  const teams = await client.execute("SELECT id, owner_id, created_at FROM teams");
  console.log(`找到 ${teams.rows.length} 个团队`);

  let syncedCount = 0;
  let alreadyExistsCount = 0;

  for (const team of teams.rows) {
    const teamId = (team as any).id;
    const ownerId = (team as any).owner_id;

    // 检查 owner 是否已在 team_members 表中
    const existing = await client.execute({
      sql: "SELECT id FROM team_members WHERE team_id = ? AND user_id = ?",
      args: [teamId, ownerId],
    });

    if (existing.rows.length === 0) {
      // 添加 owner 到 team_members
      await client.execute({
        sql: "INSERT INTO team_members (team_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)",
        args: [teamId, ownerId, (team as any).created_at],
      });
      console.log(`  团队 ${teamId}: 添加 owner ${ownerId}`);
      syncedCount++;
    } else {
      alreadyExistsCount++;
    }
  }

  console.log(`\n同步完成！`);
  console.log(`  新增: ${syncedCount}`);
  console.log(`  已存在: ${alreadyExistsCount}`);

  process.exit(0);
}

syncTeamOwners().catch((err) => {
  console.error("失败:", err);
  process.exit(1);
});
