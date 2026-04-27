import React from "react";
import { Users, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";

interface StatsBarProps {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  passRate: number;
}

const statConfig = [
  {
    key: "total" as const,
    label: "总候选人",
    icon: Users,
    colorClass: "text-(--app-text-secondary)",
    bgClass: "bg-(--app-surface-raised)",
  },
  {
    key: "passed" as const,
    label: "通过",
    icon: CheckCircle,
    colorClass: "text-(--app-success)",
    bgClass: "bg-(--app-success-soft)",
  },
  {
    key: "failed" as const,
    label: "淘汰",
    icon: XCircle,
    colorClass: "text-(--app-danger)",
    bgClass: "bg-(--app-danger-soft)",
  },
  {
    key: "pending" as const,
    label: "待评估",
    icon: Clock,
    colorClass: "text-(--app-warning)",
    bgClass: "bg-(--app-warning-soft)",
  },
];

export const StatsBar: React.FC<StatsBarProps> = ({
  total,
  passed,
  failed,
  pending,
  passRate,
}) => {
  const values = { total, passed, failed, pending };

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
      {statConfig.map(({ key, label, icon: Icon, colorClass, bgClass }) => (
        <div
          key={key}
          className="flex items-center gap-3 rounded-xl border border-(--app-border) bg-(--app-surface) px-4 py-3 shadow-(--app-shadow-sm) transition-shadow duration-200 hover:shadow-(--app-shadow)"
        >
          <div className={`rounded-lg p-2 ${bgClass}`}>
            <Icon className={`h-4 w-4 ${colorClass}`} />
          </div>
          <div>
            <p className="mb-1 text-xs leading-none text-(--app-text-muted)">
              {label}
            </p>
            <p className={`text-xl font-bold leading-none ${colorClass}`}>
              {values[key]}
            </p>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 rounded-xl border border-(--app-primary)/30 bg-(--app-primary) px-4 py-3 shadow-(--app-shadow-sm)">
        <div className="rounded-lg bg-white/15 p-2">
          <TrendingUp className="h-4 w-4 text-white" aria-hidden />
        </div>
        <div>
          <p className="mb-1 text-xs leading-none text-white/80">通过率</p>
          <p className="text-xl font-bold leading-none text-white">
            {passRate.toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
};
