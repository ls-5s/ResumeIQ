import { useId } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface WeeklyBarChartProps {
  data?: { day: string; count: number }[];
}


const DEFAULT_WEEK = [
  { day: "周一", count: 0 },
  { day: "周二", count: 0 },
  { day: "周三", count: 0 },
  { day: "周四", count: 0 },
  { day: "周五", count: 0 },
  { day: "周六", count: 0 },
  { day: "周日", count: 0 },
];

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-(--app-border) bg-(--app-surface)/95 px-3.5 py-2.5 text-sm shadow-(--app-shadow) backdrop-blur-sm">
      <p className="text-xs font-medium text-(--app-text-muted)">{label}</p>
      <p className="text-base font-semibold tabular-nums text-(--app-primary)">
        {payload[0].value}{" "}
        <span className="text-xs font-normal text-(--app-text-muted)">份</span>
      </p>
    </div>
  );
};

export function WeeklyBarChart({ data }: WeeklyBarChartProps) {
  const gradId = useId().replace(/:/g, "");
  const barFill = `url(#${gradId})`;

  const chartData = data?.length ? data : DEFAULT_WEEK;
  const dataMax = Math.max(...chartData.map((d) => d.count), 0);
  const yMax = Math.max(4, dataMax <= 0 ? 4 : Math.ceil(dataMax * 1.2));
  const allZero = chartData.every((d) => d.count === 0);

  return (
    <div className="flex h-full min-h-[300px] flex-col overflow-hidden rounded-3xl border border-(--app-border) bg-(--app-surface) shadow-(--app-shadow-sm) ring-1 ring-(--app-border-subtle)">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--app-border)/80 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-(--app-text-primary)">
            本周简历趋势
          </h2>
          <p className="mt-0.5 text-xs text-(--app-text-secondary)">
            按创建时间统计的每日新增
          </p>
        </div>
        {allZero ? (
          <span className="rounded-full border border-(--app-border) bg-(--app-surface-raised) px-2.5 py-1 text-[11px] font-medium text-(--app-text-secondary)">
            本周暂无新增
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-3 pb-4 pt-2 sm:px-5">
        <div className="relative flex-1 rounded-2xl bg-(--app-surface-raised) p-3 ring-1 ring-inset ring-(--app-border-subtle) sm:p-4">
          <div className="h-[200px] w-full sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                barCategoryGap="24%"
                margin={{ top: 12, right: 6, left: -4, bottom: 4 }}
              >
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="5 5"
                  stroke="var(--app-border-strong)"
                  strokeOpacity={0.45}
                />
                <XAxis
                  dataKey="day"
                  axisLine={{ stroke: "var(--app-border)" }}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "var(--app-text-secondary)",
                    fontWeight: 500,
                  }}
                />
                <YAxis
                  domain={[0, yMax]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--app-text-muted)" }}
                  allowDecimals={false}
                  width={32}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "var(--app-primary-soft)" }}
                />
                <Bar
                  dataKey="count"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={48}
                  fill={barFill}
                  fillOpacity={allZero ? 0.25 : 1}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={barFill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeeklyBarChart;
