import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import toast from "../../utils/toast";
import { getActivities } from "../../api/dashboard";
import type { Activity } from "../../types/dashboard";
import { ActivityTimelineRow } from "../../components/dashboard/activity-timeline";

const PAGE_SIZE = 30;

export default function ActivitiesPage() {
  const [list, setList] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await getActivities({ page: p, pageSize: PAGE_SIZE });
      setList(data.list);
      setTotal(data.total);
      setPage(data.page);
    } catch (e) {
      console.error(e);
      toast.error("加载活动记录失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="relative min-h-full">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,165,233,0.06),transparent)]"
        aria-hidden
      />

      <div className="mx-auto max-w-[800px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              to="/app"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-(--app-border) bg-(--app-surface) text-(--app-text-secondary) shadow-sm no-underline transition-colors hover:bg-(--app-surface-raised) hover:text-(--app-text-primary)"
              aria-label="返回工作台"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-(--app-text-muted)">
                Activity log
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-(--app-text-primary)">
                全部活动
              </h1>
              <p className="mt-1 text-sm text-(--app-text-secondary)">
                记录与「候选人 / 简历」相关的操作；姓名均为投递方，非当前登录账号
              </p>
            </div>
          </div>
          <p className="text-sm tabular-nums text-(--app-text-secondary) sm:text-right">
            共 <span className="font-medium text-(--app-text-primary)">{total}</span> 条
          </p>
        </header>

        <div className="overflow-hidden rounded-3xl border border-(--app-border) bg-(--app-surface) shadow-(--app-shadow-sm) ring-1 ring-(--app-border-subtle) dark:ring-(--app-border-subtle)">
          <div className="border-b border-(--app-border)/80 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold tracking-tight text-(--app-text-primary)">
              操作记录
            </h2>
            <p className="mt-0.5 text-xs text-(--app-text-secondary)">
              每条记录为一次业务操作；AI 筛选可展开查看简要说明
            </p>
          </div>

          <div className="px-4 py-5 sm:px-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-(--app-text-secondary)">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-(--app-primary)" />
                <p className="text-sm">加载中…</p>
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-(--app-surface-raised) px-6 py-16 text-center ring-1 ring-inset ring-(--app-border-subtle) dark:ring-(--app-border-subtle)">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-(--app-surface) shadow-sm ring-1 ring-(--app-border)">
                  <FileText
                    className="h-7 w-7 text-(--app-text-muted)"
                    strokeWidth={1.25}
                  />
                </div>
                <p className="text-sm font-medium text-(--app-text-secondary)">暂无活动记录</p>
                <p className="mt-1 max-w-[280px] text-xs text-(--app-text-muted)">
                  在简历管理、AI 筛选或邮件群发中进行操作后，将在此集中展示
                </p>
                <Link
                  to="/app/resumes"
                  className="mt-6 rounded-full bg-(--app-primary) px-4 py-2 text-xs font-semibold text-white no-underline shadow-sm transition-colors hover:bg-(--app-primary-hover)"
                >
                  前往简历库
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-col">
                  {list.map((activity, i) => (
                    <ActivityTimelineRow
                      key={activity.id}
                      activity={activity}
                      isLast={i === list.length - 1}
                      showDetail
                    />
                  ))}
                </div>

                {totalPages > 1 ? (
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-(--app-border) pt-6">
                    <p className="text-xs text-(--app-text-secondary)">
                      第 {page} / {totalPages} 页
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page <= 1 || loading}
                        onClick={() => void load(page - 1)}
                        className="rounded-xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-xs font-medium text-(--app-text-secondary) transition-colors hover:bg-(--app-surface-raised) disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        上一页
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalPages || loading}
                        onClick={() => void load(page + 1)}
                        className="rounded-xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-xs font-medium text-(--app-text-secondary) transition-colors hover:bg-(--app-surface-raised) disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
