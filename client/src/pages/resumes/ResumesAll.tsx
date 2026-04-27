import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "../../utils/toast";
import { Search } from "lucide-react";
import { getResumes, deleteResume, getResume } from "../../api/resume";
import { logActivity } from "../../api/dashboard";
import type { Resume } from "../../types/resume";
import {
  ResumeList,
  ResumeDetailDrawer,
  ResumePaginationBar,
  DEFAULT_PAGE_SIZE,
} from "../../components/resumes";
import { ConfirmModal } from "../../components/Modal";
import { serverDateToMs } from "../../utils/format";

type StatusFilter = "all" | "pending" | "passed" | "rejected";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "待筛选" },
  { value: "passed", label: "已通过" },
  { value: "rejected", label: "已拒绝" },
];

function SkeletonAllTable() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-3xl border border-zinc-200/70 bg-white">
      <div className="border-b border-zinc-100 px-6 py-4">
        <div className="h-4 w-28 rounded bg-zinc-100" />
        <div className="mt-2 h-3 w-40 rounded bg-zinc-100" />
      </div>
      <div className="flex flex-1 flex-col gap-px">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-zinc-100 bg-white px-6 py-4 last:border-b-0"
          >
            <div className="flex flex-1 items-center gap-3">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-zinc-100" />
              <div className="h-3 w-28 rounded bg-zinc-100" />
            </div>
            <div className="h-5 w-16 rounded-full bg-zinc-100" />
            <div className="h-3 w-40 rounded bg-zinc-100" />
            <div className="h-3 w-28 rounded bg-zinc-100" />
            <div className="ml-auto flex gap-2">
              <div className="h-8 w-8 rounded-md bg-zinc-100" />
              <div className="h-8 w-8 rounded-md bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResumesAll() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewResume, setViewResume] = useState<Resume | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadResumes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getResumes();
      setResumes(data);
    } catch (error) {
      console.error("加载简历失败:", error);
      toast.error("加载简历失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadResumes();
  }, [loadResumes]);

  const sortedResumes = useMemo(() => {
    return [...resumes].sort(
      (a, b) => serverDateToMs(b.createdAt) - serverDateToMs(a.createdAt),
    );
  }, [resumes]);

  const filteredResumes = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return sortedResumes.filter((r) => {
      const matchKeyword =
        !kw ||
        r.name.toLowerCase().includes(kw) ||
        (r.email && r.email.toLowerCase().includes(kw)) ||
        (r.phone && r.phone.includes(keyword.trim()));
      const matchStatus =
        statusFilter === "all" || r.status === statusFilter;
      return matchKeyword && matchStatus;
    });
  }, [sortedResumes, keyword, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredResumes.length / pageSize));
  const paginatedResumes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredResumes.slice(start, start + pageSize);
  }, [filteredResumes, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, statusFilter]);

  // 切换 pageSize 时回到第一页
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleDelete = (id: number, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    const { id, name } = deleteConfirm;
    setDeleteLoading(true);
    try {
      await deleteResume(id);
      await logActivity({
        type: "reject",
        resumeId: id,
        resumeName: name,
        description: "删除了简历",
      });
      toast.success("删除成功");
      setDeleteConfirm(null);
      void loadResumes();
    } catch (error) {
      console.error("删除失败:", error);
      toast.error("删除失败");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleView = async (id: number) => {
    setViewLoading(true);
    try {
      const data = await getResume(id);
      setViewResume(data);
    } catch (error) {
      console.error("获取简历详情失败:", error);
      toast.error("获取简历详情失败");
    } finally {
      setViewLoading(false);
    }
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="relative min-h-full">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,165,233,0.08),transparent)]"
        aria-hidden
      />

      <div className="mx-auto max-w-[1360px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Resume Library
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
                全部简历
              </h1>
              <Link
                to="/app/resumes"
                className="text-sm font-semibold text-sky-600 no-underline transition-colors hover:text-sky-700"
              >
                ← 返回概览
              </Link>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              共 {resumes.length.toLocaleString()} 份，按导入时间从新到旧排列
            </p>
          </div>
          <time
            dateTime={now.toISOString()}
            className="text-sm tabular-nums text-zinc-500"
          >
            {dateStr}
          </time>
        </header>

        <section
          className="overflow-hidden rounded-3xl border border-zinc-200/70 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)]"
          aria-label="全部简历列表"
        >
          <div className="flex flex-col gap-4 border-b border-zinc-100/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-900">
                全部列表
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                共 {filteredResumes.length} 份 · 每页 {pageSize} 条
                {keyword || statusFilter !== "all"
                  ? " · 按导入时间从新到旧"
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索姓名/邮箱/电话"
                  className="h-9 w-40 rounded-lg border border-zinc-200/80 bg-white pl-8 pr-3 text-sm text-zinc-700 placeholder:text-zinc-400 outline-none transition-colors focus:border-sky-400 focus:ring-1 focus:ring-sky-200 sm:w-48"
                  aria-label="搜索简历"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
                className="h-9 rounded-lg border border-zinc-200/80 bg-white px-3 pr-8 text-sm text-zinc-600 outline-none transition-colors focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
                aria-label="按状态筛选"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <SkeletonAllTable />
          ) : (
            <>
              <ResumeList
                resumes={paginatedResumes}
                loading={loading}
                onView={handleView}
                onDelete={handleDelete}
                emptyTitle={
                  resumes.length > 0 && filteredResumes.length === 0
                    ? "暂无匹配"
                    : undefined
                }
                emptyDescription={
                  resumes.length > 0 && filteredResumes.length === 0
                    ? "请调整筛选条件"
                    : undefined
                }
              />
              <ResumePaginationBar
                totalCount={filteredResumes.length}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </>
          )}
        </section>
      </div>

      <ResumeDetailDrawer
        resume={viewResume}
        loading={viewLoading}
        onOpenChange={(open) => !open && setViewResume(null)}
      />

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="确认删除"
        message={`确定要删除简历「${deleteConfirm?.name}」吗？此操作不可恢复。`}
        confirmText="删除"
        confirmVariant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
