import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

export interface ResumePaginationBarProps {
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function buildPageItems(
  totalPages: number,
  currentPage: number,
): (number | "...")[] {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => {
      if (totalPages <= 7) return true;
      if (p === 1 || p === totalPages) return true;
      if (Math.abs(p - currentPage) <= 1) return true;
      return false;
    },
  );

  return pages.reduce<(number | "...")[]>((acc, p, idx, arr) => {
    if (idx > 0 && arr[idx - 1] !== p - 1) {
      acc.push("...");
    }
    acc.push(p);
    return acc;
  }, []);
}

export function ResumePaginationBar({
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: ResumePaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageItems = buildPageItems(totalPages, currentPage);

  if (totalPages <= 1) {
    return null;
  }

  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--app-border) px-6 py-4">
      <div className="flex items-center gap-3">
        <p className="text-xs text-(--app-text-secondary)">
          第 {rangeStart}–{rangeEnd} 条，共 {totalCount} 份
        </p>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-lg border border-(--app-border) bg-(--app-surface) px-2 py-1 text-xs text-(--app-text-secondary) outline-none focus:border-(--app-primary) focus:ring-1 focus:ring-(--app-primary)/25"
          aria-label="每页条数"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} 条/页
            </option>
          ))}
        </select>
      </div>

      <nav className="flex items-center gap-1" aria-label="分页">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-(--app-border) bg-(--app-surface) text-(--app-text-secondary) transition-colors hover:border-(--app-border-strong) hover:bg-(--app-surface-raised) disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-(--app-surface)"
          aria-label="首页"
        >
          <span className="text-xs font-medium">«</span>
        </button>

        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-(--app-border) bg-(--app-surface) text-(--app-text-secondary) transition-colors hover:border-(--app-border-strong) hover:bg-(--app-surface-raised) disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-(--app-surface)"
          aria-label="上一页"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-0.5">
          {pageItems.map((item, idx) =>
            item === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="flex h-9 w-8 items-center justify-center text-(--app-text-muted)"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={`
                  flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium transition-colors
                  ${
                    item === currentPage
                      ? "border-(--app-primary) bg-(--app-primary-soft) text-(--app-primary)"
                      : "border-(--app-border) bg-(--app-surface) text-(--app-text-secondary) hover:border-(--app-border-strong) hover:bg-(--app-surface-raised)"
                  }
                `}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-(--app-border) bg-(--app-surface) text-(--app-text-secondary) transition-colors hover:border-(--app-border-strong) hover:bg-(--app-surface-raised) disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-(--app-surface)"
          aria-label="下一页"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-(--app-border) bg-(--app-surface) text-(--app-text-secondary) transition-colors hover:border-(--app-border-strong) hover:bg-(--app-surface-raised) disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-(--app-surface)"
          aria-label="末页"
        >
          <span className="text-xs font-medium">»</span>
        </button>
      </nav>
    </div>
  );
}
