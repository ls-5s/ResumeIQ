// 修复简历表，为没有 teamId 的简历分配团队
// 使用方法: npx tsx scripts/fix-resume-teamid.ts

import { createClient } from "@libsql/client";

const TURSO_DATABASE_URL = "libsql://ai-resume-db-ls-5s.aws-us-east-1.turso.io";
const TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQ1MTgwMjgsImlkIjoiMDE5ZDI5ODItOWQwMS03N2M3LWFmOGMtZjIwYjIwYzY1NWVjIiwicmlkIjoiMjY1ZTcxYTctMDhlOC00MGQ2LTgzZGQtMWY0YzM3NzZkM2E1In0.B_fFln0WF94QmxpL5LVU_YIcGqNQERyolD0khjLGgzsU2rca1VHCiVHkSfA80UxNTMmIGNUQgBvAckI86xzCAQ";

const client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

async function fixResumeTeamId() {
  console.log("开始修复简历的 teamId...");

  // 获取所有没有 teamId 的简历
  const resumesWithoutTeam = await client.execute(
    "SELECT id, user_id FROM resumes WHERE team_id IS NULL"
  );
  console.log(`找到 ${resumesWithoutTeam.rows.length} 条简历没有 teamId`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const resume of resumesWithoutTeam.rows) {
    const resumeId = (resume as any).id;
    const userId = (resume as any).user_id;

    // 1. 首先查找用户作为 owner 的团队
    const ownerTeam = await client.execute({
      sql: "SELECT id FROM teams WHERE owner_id = ? LIMIT 1",
      args: [userId],
    });

    if (ownerTeam.rows.length > 0) {
      const teamId = (ownerTeam.rows[0] as any).id;
      await client.execute({
        sql: "UPDATE resumes SET team_id = ? WHERE id = ?",
        args: [teamId, resumeId],
      });
      updatedCount++;
      console.log(`  简历 ${resumeId}: 分配到 owner 团队 ${teamId}`);
      continue;
    }

    // 2. 查找用户作为 member/admin 的团队
    const membership = await client.execute({
      sql: "SELECT team_id FROM team_members WHERE user_id = ? LIMIT 1",
      args: [userId],
    });

    if (membership.rows.length > 0) {
      const teamId = (membership.rows[0] as any).team_id;
      await client.execute({
        sql: "UPDATE resumes SET team_id = ? WHERE id = ?",
        args: [teamId, resumeId],
      });
      updatedCount++;
      console.log(`  简历 ${resumeId}: 分配到成员团队 ${teamId}`);
      continue;
    }

    // 3. 没有找到任何团队，跳过
    skippedCount++;
    console.log(`  简历 ${resumeId}: 用户 ${userId} 不属于任何团队，跳过`);
  }

  console.log(`\n修复完成！`);
  console.log(`  已更新: ${updatedCount}`);
  console.log(`  已跳过: ${skippedCount}`);

  process.exit(0);
}

fixResumeTeamId().catch((err) => {
  console.error("失败:", err);
  process.exit(1);
});
