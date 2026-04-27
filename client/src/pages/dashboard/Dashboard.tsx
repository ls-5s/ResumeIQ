import { useState, useEffect } from "react";
import { getDashboardStats } from "../../api/dashboard";
import type { DashboardStats } from "../../types/dashboard";
import {
  StatCardList,
  ActivityList,
  QuickActions,
  WeeklyBarChart,
} from "../../components/dashboard";
import toast from "../../utils/toast";

function SkeletonStrip() {
  return (
    <div className="animate-pulse overflow-hidden rounded-3xl border border-(--app-border) bg-(--app-surface)">
      <div className="grid grid-cols-2 divide-x divide-y divide-(--app-border) lg:grid-cols-4 lg:divide-y-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6">
            <div className="mb-4 flex justify-between">
              <div className="h-3 w-16 rounded bg-(--app-skeleton)" />
              <div className="h-9 w-9 rounded-xl bg-(--app-skeleton)" />
            </div>
            <div className="h-9 w-20 rounded-lg bg-(--app-skeleton)" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="flex min-h-[300px] animate-pulse flex-col overflow-hidden rounded-3xl border border-(--app-border) bg-(--app-surface)">
      <div className="border-b border-(--app-border) px-6 py-4">
        <div className="h-4 w-32 rounded bg-(--app-skeleton)" />
        <div className="mt-2 h-3 w-48 rounded bg-(--app-skeleton)" />
      </div>
      <div className="m-4 flex flex-1 rounded-2xl bg-(--app-skeleton)/80 p-4">
        <div className="flex flex-1 items-end gap-2">
          {(
            [
              "h-[35%]",
              "h-[55%]",
              "h-[40%]",
              "h-[70%]",
              "h-[50%]",
              "h-[65%]",
              "h-[45%]",
            ] as const
          ).map((hClass, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t-lg bg-(--app-border-strong)/90 ${hClass}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonActivity() {
  return (
    <div className="flex min-h-[300px] animate-pulse flex-col rounded-3xl border border-(--app-border) bg-(--app-surface)">
      <div className="border-b border-(--app-border) px-6 py-4">
        <div className="h-4 w-24 rounded bg-(--app-skeleton)" />
        <div className="mt-2 h-3 w-32 rounded bg-(--app-skeleton)" />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-7 w-7 shrink-0 rounded-full bg-(--app-skeleton)" />
            <div className="flex-1 space-y-2 pt-0.5">
              <div className="h-3 w-full max-w-xs rounded bg-(--app-skeleton)" />
              <div className="h-2.5 w-20 rounded bg-(--app-skeleton)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonQuick() {
  return (
    <div className="animate-pulse rounded-3xl border border-(--app-border) bg-(--app-surface) px-6 py-5">
      <div className="mb-4 h-3 w-20 rounded bg-(--app-skeleton)" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-(--app-skeleton)" />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    pending: 0,
    passed: 0,
    rejected: 0,
    todayCount: 0,
    recentActivities: [],
    weeklyData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error("加载统计数据失败:", err);
        toast.error("加载统计数据失败");
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "上午好" : now.getHours() < 18 ? "下午好" : "晚上好";

  const dateStr = now.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="relative min-h-full">
      {/* 页面弱氛围：与侧栏背景区分 */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,165,233,0.08),transparent)]"
        aria-hidden
      />

      <div className="mx-auto max-w-[1360px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-(--app-text-muted)">
              Overview
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-(--app-text-primary) sm:text-[1.75rem]">
              {greeting}
              <span className="font-normal text-(--app-text-secondary)">，</span>
              工作台
            </h1>
          </div>
          <time
            dateTime={now.toISOString()}
            className="text-sm tabular-nums text-(--app-text-secondary)"
          >
            {dateStr}
          </time>
        </header>

        {/* 统一 KPI 带：减少四张独立卡片的「碎」感 */}
        <section aria-label="数据概览" className="mb-6 sm:mb-8">
          {loading ? <SkeletonStrip /> : <StatCardList stats={stats} />}
        </section>

        {/* 主信息区：趋势与动态等高并排，信息权重对称 */}
        <section
          aria-label="趋势与动态"
          className="mb-6 grid grid-cols-1 gap-5 lg:mb-8 lg:grid-cols-12 lg:gap-6 lg:items-stretch"
        >
          <div className="lg:col-span-7">
            {loading ? (
              <SkeletonChart />
            ) : (
              <WeeklyBarChart data={stats.weeklyData} />
            )}
          </div>
          <div className="lg:col-span-5">
            {loading ? (
              <SkeletonActivity />
            ) : (
              <ActivityList activities={stats.recentActivities} />
            )}
          </div>
        </section>

        {/* 快捷入口：底部 launcher，避免与图表抢纵向空间 */}
        <section aria-label="快捷入口">
          {loading ? <SkeletonQuick /> : <QuickActions />}
        </section>
      </div>
    </div>
  );
}
