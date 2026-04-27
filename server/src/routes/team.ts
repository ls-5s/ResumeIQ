import { Router, Request, Response } from "express";
import type { Router as RouterType } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getUserTeam,
  updateTeam,
  getTeamMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
  getUserRole,
  createInviteLink,
  applyToJoin,
  getPendingInvites,
  approveJoinRequest,
  rejectJoinRequest,
  getInviteInfo,
} from "../services/team/team.js";

const router: RouterType = Router();

// 获取当前用户的团队信息
router.get("/team", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const team = await getUserTeam(userId);

    // 用户没有团队
    if (team.id === 0) {
      return res.status(200).json({
        code: 200,
        data: {
          id: 0,
          name: "",
          description: null,
          ownerId: 0,
          createdAt: "",
          updatedAt: "",
          hasTeam: false,
        },
      });
    }

    res.status(200).json({
      code: 200,
      data: {
        ...team,
        hasTeam: true,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取团队信息失败";
    res.status(400).json({ code: 400, message });
  }
});

// 更新团队信息
router.put("/team", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { name, description } = req.body;

    const team = await updateTeam(userId, { name, description });

    res.status(200).json({
      code: 200,
      data: team,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新团队信息失败";
    res.status(400).json({ code: 400, message });
  }
});

// 获取团队成员列表
router.get("/team/members", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const members = await getTeamMembers(userId);

    res.status(200).json({
      code: 200,
      data: members,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取团队成员失败";
    res.status(400).json({ code: 400, message });
  }
});

// 邀请成员（生成邀请链接）
router.post("/team/members/invite", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { role } = req.body;

    const invite = await createInviteLink(userId, { role });

    res.status(201).json({
      code: 201,
      data: invite,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "邀请成员失败";
    res.status(400).json({ code: 400, message });
  }
});

// 申请加入团队（替代直接接受，需登录）
router.post("/team/invites/:token/apply", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { token } = req.params;

    await applyToJoin(token as string, userId);

    res.status(200).json({
      code: 200,
      message: "申请已提交，请等待管理员审核",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "申请失败";
    res.status(400).json({ code: 400, message });
  }
});

// 获取待审核申请列表（仅 owner/admin 可用）
router.get("/team/pending-invites", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const pending = await getPendingInvites(userId);

    res.status(200).json({
      code: 200,
      data: pending,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取申请列表失败";
    res.status(400).json({ code: 400, message });
  }
});

// 批准加入申请（仅 owner/admin 可用）
router.post("/team/pending-invites/:inviteId/approve", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const inviteId = parseInt(req.params.inviteId as string, 10);

    if (isNaN(inviteId)) {
      return res.status(400).json({
        code: 400,
        message: "无效的申请ID",
      });
    }

    const member = await approveJoinRequest(userId, inviteId);

    res.status(200).json({
      code: 200,
      data: member,
      message: "已批准加入申请",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "批准申请失败";
    res.status(400).json({ code: 400, message });
  }
});

// 拒绝加入申请（仅 owner/admin 可用）
router.post("/team/pending-invites/:inviteId/reject", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const inviteId = parseInt(req.params.inviteId as string, 10);

    if (isNaN(inviteId)) {
      return res.status(400).json({
        code: 400,
        message: "无效的申请ID",
      });
    }

    await rejectJoinRequest(userId, inviteId);

    res.status(200).json({
      code: 200,
      message: "已拒绝加入申请",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "拒绝申请失败";
    res.status(400).json({ code: 400, message });
  }
});

// 获取邀请信息（无需登录，用于预览）
router.get("/team/invites/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const info = await getInviteInfo(token as string);

    if (!info) {
      return res.status(404).json({
        code: 404,
        message: "邀请链接无效",
      });
    }

    res.json({
      code: 200,
      data: info,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取邀请信息失败";
    res.status(400).json({ code: 400, message });
  }
});

// 移除成员
router.delete("/team/members/:memberId", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const memberId = parseInt(req.params.memberId as string, 10);

    if (isNaN(memberId)) {
      return res.status(400).json({
        code: 400,
        message: "无效的成员ID",
      });
    }

    await removeMember(userId, memberId);

    res.status(200).json({
      code: 200,
      message: "成员已移除",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "移除成员失败";
    res.status(400).json({ code: 400, message });
  }
});

// 更新成员角色
router.patch("/team/members/:memberId", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const memberId = parseInt(req.params.memberId as string, 10);
    const { role } = req.body;

    if (isNaN(memberId)) {
      return res.status(400).json({
        code: 400,
        message: "无效的成员ID",
      });
    }

    if (!role || (role !== "admin" && role !== "member")) {
      return res.status(400).json({
        code: 400,
        message: "角色必须是 admin 或 member",
      });
    }

    const updated = await updateMemberRole(userId, memberId, role);

    res.status(200).json({
      code: 200,
      data: updated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新成员角色失败";
    res.status(400).json({ code: 400, message });
  }
});

// 获取当前用户的角色
router.get("/team/role", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const role = await getUserRole(userId);

    res.status(200).json({
      code: 200,
      data: { role, userId },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取角色失败";
    res.status(400).json({ code: 400, message });
  }
});

// 离开团队
router.post("/team/leave", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await removeMember(userId, userId);

    res.status(200).json({
      code: 200,
      message: "已离开团队",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "离开团队失败";
    res.status(400).json({ code: 400, message });
  }
});

export default router;
