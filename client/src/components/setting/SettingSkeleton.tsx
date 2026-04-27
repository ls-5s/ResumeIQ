interface SettingSkeletonProps {
  rows?: number;
  message?: string;
}

export function SettingSkeleton({
  rows = 3,
  message = "加载中...",
}: SettingSkeletonProps) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-6 rounded-3xl border border-(--app-border) bg-(--app-surface) p-8 shadow-(--app-shadow-sm)">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-48 animate-pulse rounded-2xl bg-(--app-skeleton)"
            />
          ))}
        </div>
        <div className="h-3 w-32 animate-pulse rounded-full bg-(--app-skeleton)" />
      </div>
      <p className="text-sm text-(--app-text-muted)">{message}</p>
    </div>
  );
}
