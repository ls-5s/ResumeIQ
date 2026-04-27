import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Users, Clock, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useLoginStore } from "../../store/Login";
import { getInvitePreview, applyToJoinTeam } from "../../api/team";
import type { InvitePreview } from "../../types/team";

type Status = "loading" | "preview" | "applying" | "success" | "error";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { token: authToken } = useLoginStore();

  const [status, setStatus] = useState<Status>("loading");
  const [inviteInfo, setInviteInfo] = useState<InvitePreview | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const isApplying = status === "applying";

  useEffect(() => {
    if (!token) return;

    void getInvitePreview(token)
      .then((info) => {
        setInviteInfo(info);
        setStatus("preview");
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "邀请链接无效或已失效";
        setErrorMsg(msg);
        setStatus("error");
      });
  }, [token]);

  const handleApply = async () => {
    if (!token) return;
    setStatus("applying");
    try {
      await applyToJoinTeam(token);
      setStatus("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "申请失败";
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  const handleGoLogin = () => {
    navigate(`/?redirect=invite:${token}`);
  };

  const handleGoDashboard = () => {
    navigate("/app");
  };

  const isExpired = inviteInfo
    ? new Date(inviteInfo.expiresAt) < new Date()
    : false;
  const roleLabel = inviteInfo?.role === "admin" ? "管理员" : "成员";

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--app-bg) px-4">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(14,165,233,0.08),transparent)]"
          aria-hidden
        />
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-(--app-primary) to-(--app-accent) shadow-lg shadow-(--app-primary)/20">
              <Users className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-(--app-text-primary)">团队邀请</h1>
          </div>
          <div className="rounded-2xl border border-(--app-border) bg-(--app-surface) p-8 shadow-sm">
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="mb-1 font-semibold text-(--app-text-primary)">邀请链接无效</p>
                <p className="text-sm text-(--app-text-muted)">邀请链接无效</p>
              </div>
              <button
                onClick={() => void handleGoDashboard()}
                className="mt-2 w-full rounded-xl border border-(--app-border) bg-(--app-surface) px-5 py-2.5 text-sm font-medium text-(--app-text-primary) transition-colors hover:bg-(--app-surface-raised)"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--app-bg) px-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(14,165,233,0.08),transparent)]"
        aria-hidden
      />

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-(--app-primary) to-(--app-accent) shadow-lg shadow-(--app-primary)/20">
            <Users className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-(--app-text-primary)">团队邀请</h1>
        </div>

        <div className="rounded-2xl border border-(--app-border) bg-(--app-surface) p-8 shadow-sm">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-(--app-primary)" />
              <p className="text-sm text-(--app-text-muted)">加载邀请信息...</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="mb-1 font-semibold text-(--app-text-primary)">出错了</p>
                <p className="text-sm text-(--app-text-muted)">{errorMsg}</p>
              </div>
              <button
                onClick={() => void handleGoDashboard()}
                className="mt-2 w-full rounded-xl border border-(--app-border) bg-(--app-surface) px-5 py-2.5 text-sm font-medium text-(--app-text-primary) transition-colors hover:bg-(--app-surface-raised)"
              >
                返回首页
              </button>
            </div>
          )}

          {status === "preview" && (
            <>
              {isExpired && (
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">邀请链接已过期</p>
                    <p className="text-xs text-amber-500/80">请联系团队管理员重新发送邀请</p>
                  </div>
                </div>
              )}

              {inviteInfo?.status === "accepted" && (
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">已成功加入团队</p>
                    <p className="text-xs text-green-500/80">你可以开始使用团队功能了</p>
                  </div>
                </div>
              )}

              {inviteInfo?.status === "rejected" && (
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">申请已被拒绝</p>
                    <p className="text-xs text-red-500/80">请联系管理员重新发起申请</p>
                  </div>
                </div>
              )}

              {inviteInfo?.status === "waiting_approval" && (
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">申请已提交</p>
                    <p className="text-xs text-blue-500/80">请等待管理员审核，审核结果会通知你</p>
                  </div>
                </div>
              )}

              {inviteInfo?.status !== "accepted" && inviteInfo?.status !== "rejected" && inviteInfo?.status !== "waiting_approval" && (
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-(--app-primary) to-(--app-accent) text-white shadow-sm">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-(--app-text-primary)">
                      邀请你加入团队
                    </p>
                    <p className="mt-0.5 text-base font-medium text-(--app-primary)">
                      {inviteInfo?.teamName}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-(--app-text-muted)">
                      <span>邀请人：{inviteInfo?.inviterName}</span>
                      <span>·</span>
                      <span>角色：{roleLabel}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-(--app-text-muted)">
                      有效期至{" "}
                      {inviteInfo?.expiresAt
                        ? new Date(inviteInfo.expiresAt).toLocaleDateString("zh-CN")
                        : "—"}
                    </p>
                  </div>
                </div>
              )}

              {inviteInfo?.status === "pending" && (
                <>
                  {!authToken ? (
                    <div className="space-y-3">
                      <p className="text-sm text-(--app-text-secondary)">
                        请先登录账号，然后提交加入申请
                      </p>
                      <button
                        onClick={() => void handleGoLogin()}
                        className="w-full rounded-xl bg-linear-to-r from-(--app-primary) to-(--app-accent) px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
                      >
                        登录后申请加入
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-(--app-text-secondary)">
                        点击下方按钮提交加入申请，管理员审核通过后即可加入团队
                      </p>
                      <button
                        onClick={() => void handleApply()}
                        disabled={isApplying}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-(--app-primary) to-(--app-accent) px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isApplying ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            提交中...
                          </>
                        ) : (
                          <>
                            <Users className="h-4 w-4" />
                            申请加入团队
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}

              {(inviteInfo?.status === "waiting_approval" || inviteInfo?.status === "accepted" || inviteInfo?.status === "rejected") && (
                <button
                  onClick={() => void handleGoDashboard()}
                  className="mt-4 w-full rounded-xl border border-(--app-border) bg-(--app-surface) px-5 py-2.5 text-sm font-medium text-(--app-text-primary) transition-colors hover:bg-(--app-surface-raised)"
                >
                  返回首页
                </button>
              )}
            </>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="mb-1 font-semibold text-(--app-text-primary)">申请已提交！</p>
                <p className="text-sm text-(--app-text-muted)">请等待管理员审核，审核结果会通知你</p>
              </div>
              <button
                onClick={() => void handleGoDashboard()}
                className="mt-2 w-full rounded-xl bg-linear-to-r from-(--app-primary) to-(--app-accent) px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
              >
                返回首页
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-(--app-text-muted)">
          AI Resume Screening
        </p>
      </div>
    </div>
  );
}
