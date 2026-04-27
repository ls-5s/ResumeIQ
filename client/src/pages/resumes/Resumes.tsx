import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "../../utils/toast";
import { Upload, Mail } from "lucide-react";
import {
  getResumes,
  uploadResume,
  deleteResume,
  getResume,
  importResumesFromEmail,
} from "../../api/resume";
import { getEmailConfigs } from "../../api/email";
import { logActivity } from "../../api/dashboard";
import type { Resume } from "../../types/resume";
import type { EmailConfig } from "../../types/email";
import {
  ResumeList,
  ResumeModal,
  ResumeDetailDrawer,
  ResumeStatusPieChart,
  ResumePaginationBar,
  DEFAULT_PAGE_SIZE,
} from "../../components/resumes";
import { ConfirmModal } from "../../components/Modal";
import { serverDateToMs } from "../../utils/format";

const RECENT_IMPORT_LIMIT = 3;

// ============================================================================
// Skeleton
// ============================================================================

function SkeletonPie() {
  return (
    <div className="flex min-h-[240px] animate-pulse flex-col overflow-hidden rounded-3xl border border-(--app-border) bg-(--app-surface)">
      <div className="border-b border-(--app-border) px-6 py-4">
        <div className="h-4 w-32 rounded bg-(--app-skeleton)" />
        <div className="mt-2 h-3 w-48 rounded bg-(--app-skeleton)" />
      </div>
      <div className="m-4 flex flex-1 items-center justify-center">
        <div className="h-40 w-40 rounded-full bg-(--app-skeleton)" />
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-3xl border border-(--app-border) bg-(--app-surface)">
      <div className="border-b border-(--app-border) px-6 py-4">
        <div className="h-4 w-24 rounded bg-(--app-skeleton)" />
        <div className="mt-2 h-3 w-32 rounded bg-(--app-skeleton)" />
      </div>
      <div className="flex flex-1 flex-col gap-px">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-(--app-border) bg-(--app-surface) px-6 py-4 last:border-b-0"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-(--app-skeleton)" />
              <div className="h-3 w-28 rounded bg-(--app-skeleton)" />
            </div>
            <div className="h-5 w-16 rounded-full bg-(--app-skeleton)" />
            <div className="h-3 w-40 rounded bg-(--app-skeleton)" />
            <div className="h-3 w-28 rounded bg-(--app-skeleton)" />
            <div className="ml-auto flex gap-2">
              <div className="h-8 w-8 rounded-md bg-(--app-skeleton)" />
              <div className="h-8 w-8 rounded-md bg-(--app-skeleton)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main
// ============================================================================

export default function Resumes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewResume, setViewResume] = useState<Resume | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "upload") {
      setShowModal(true);
      searchParams.delete("action");
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const [showImportModal, setShowImportModal] = useState(false);
  const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

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

  const [viewMode, setViewMode] = useState<"overview" | "all">("overview");
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(DEFAULT_PAGE_SIZE);

  const latestImportedResumes = useMemo(() => {
    return [...resumes]
      .sort((a, b) => serverDateToMs(b.createdAt) - serverDateToMs(a.createdAt))
      .slice(0, RECENT_IMPORT_LIMIT);
  }, [resumes]);

  const allResumesSorted = useMemo(() => {
    return [...resumes].sort(
      (a, b) => serverDateToMs(b.createdAt) - serverDateToMs(a.createdAt),
    );
  }, [resumes]);

  const allListTotalPages = Math.max(
    1,
    Math.ceil(allResumesSorted.length / listPageSize),
  );

  useEffect(() => {
    if (viewMode !== "all") return;
    if (listPage > allListTotalPages) {
      setListPage(Math.max(1, allListTotalPages));
    }
  }, [viewMode, listPage, allListTotalPages]);

  const displayedResumes = useMemo(() => {
    if (viewMode === "overview") {
      return latestImportedResumes;
    }
    const start = (listPage - 1) * listPageSize;
    return allResumesSorted.slice(start, start + listPageSize);
  }, [
    viewMode,
    latestImportedResumes,
    allResumesSorted,
    listPage,
    listPageSize,
  ]);

  const handleListPageSizeChange = (size: number) => {
    setListPageSize(size);
    setListPage(1);
  };

  const stats = useMemo(
    () => ({
      total: resumes.length,
      pending: resumes.filter((r) => r.status === "pending").length,
      passed: resumes.filter((r) => r.status === "passed").length,
      rejected: resumes.filter((r) => r.status === "rejected").length,
    }),
    [resumes],
  );

  const loadEmailConfigs = async () => {
    setLoadingConfigs(true);
    try {
      const data = await getEmailConfigs();
      setEmailConfigs(data);
      if (data.length > 0) {
        const defaultConfig = data.find((c) => c.isDefault) ?? data[0];
        setSelectedConfigId(defaultConfig.id);
      }
    } catch (error) {
      console.error("加载邮箱配置失败:", error);
      toast.error("加载邮箱配置失败");
    } finally {
      setLoadingConfigs(false);
    }
  };

  const handleOpenImportModal = async () => {
    setShowImportModal(true);
    await loadEmailConfigs();
  };

  const handleImportFromEmail = async () => {
    if (!selectedConfigId) {
      toast.error("请选择邮箱配置");
      return;
    }

    setImporting(true);
    try {
      const result = await importResumesFromEmail({
        configId: selectedConfigId,
      });
      await logActivity({
        type: "upload",
        description: `从邮箱导入 ${result.imported} 份简历`,
      });
      toast.success(`成功导入 ${result.imported} 份简历`);
      setShowImportModal(false);
      setSelectedConfigId(null);
      void loadResumes();
    } catch (error) {
      console.error("从邮箱导入失败:", error);
      toast.error("从邮箱导入失败");
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("只支持 PDF、Word 文档");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("文件大小不能超过 10MB");
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("请选择文件");
      return;
    }

    setUploading(true);
    try {
      const data = await uploadResume({
        file: selectedFile,
        name: selectedFile.name.replace(/\.(pdf|docx|doc)$/i, ""),
      });
      await logActivity({
        type: "upload",
        resumeId: data.id,
        resumeName: data.name,
      });
      toast.success("上传成功");
      setShowModal(false);
      setSelectedFile(null);
      void loadResumes();
    } catch (error) {
      console.error("上传失败:", error);
      toast.error("上传失败");
    } finally {
      setUploading(false);
    }
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

  const emptyAfterFilter = false;

  return (
    <div className="relative min-h-full">
      {/* 径向氛围背景：与仪表盘一致 */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,165,233,0.08),transparent)]"
        aria-hidden
      />

      <div className="mx-auto max-w-[1360px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        {/* 页头：与 Dashboard 完全对齐 */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-(--app-text-muted)">
              Resume Management
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-(--app-text-primary) sm:text-[1.75rem]">
              简历管理
            </h1>
          </div>
          <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div
              className="inline-flex rounded-xl border border-(--app-border) bg-(--app-surface-raised)/80 p-1"
              role="group"
              aria-label="切换视图"
            >
              <button
                type="button"
                onClick={() => setViewMode("overview")}
                className={`
                  rounded-lg px-4 py-2 text-sm font-medium transition-colors
                  ${
                    viewMode === "overview"
                      ? "bg-(--app-surface) text-(--app-text-primary) shadow-(--app-shadow-sm) ring-1 ring-(--app-border)"
                      : "text-(--app-text-secondary) hover:text-(--app-text-primary)"
                  }
                `}
              >
                概览
              </button>
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className={`
                  rounded-lg px-4 py-2 text-sm font-medium transition-colors
                  ${
                    viewMode === "all"
                      ? "bg-(--app-surface) text-(--app-text-primary) shadow-(--app-shadow-sm) ring-1 ring-(--app-border)"
                      : "text-(--app-text-secondary) hover:text-(--app-text-primary)"
                  }
                `}
              >
                全部简历
              </button>
            </div>
          </div>
        </header>

        {/* 左图右导入：饼图 + 搜索/导入区（仅概览时显示） */}
        {viewMode === "overview" && (
          <section
            aria-label="简历概览与操作"
            className="mb-5 grid grid-cols-1 gap-5 lg:mb-6 lg:grid-cols-12 lg:gap-6 lg:items-stretch"
          >
            <div className="lg:col-span-8">
              {loading ? (
                <SkeletonPie />
              ) : (
                <ResumeStatusPieChart
                  total={stats.total}
                  pending={stats.pending}
                  passed={stats.passed}
                  rejected={stats.rejected}
                />
              )}
            </div>
            <div className="lg:col-span-4">
              <div className="flex h-full flex-col rounded-3xl border border-(--app-border) bg-(--app-surface) p-5 shadow-(--app-shadow-sm)">
                <div className="mb-auto space-y-1.5">
                  <h2 className="text-sm font-semibold tracking-tight text-(--app-text-primary)">
                    操作
                  </h2>
                  <p className="text-xs leading-relaxed text-(--app-text-secondary)">
                    上传文件或从已绑定邮箱拉取附件，快速进入智能筛选。
                  </p>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleOpenImportModal}
                    className="group flex h-11 w-full items-center justify-center gap-2.5 rounded-2xl border border-(--app-border) bg-(--app-surface-raised)/60 text-sm font-medium text-(--app-text-secondary) backdrop-blur-sm transition-all hover:border-(--app-primary)/20 hover:bg-(--app-primary-soft)/70 hover:text-(--app-primary-hover)"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-(--app-text-muted) transition-colors group-hover:text-(--app-primary)" />
                    邮箱导入
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="group flex h-11 w-full items-center justify-center gap-2.5 rounded-2xl bg-(--app-primary) text-sm font-semibold text-white shadow-(--app-shadow-primary) transition-all hover:bg-(--app-primary-hover)"
                  >
                    <Upload className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                    上传简历
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 列表 */}
        <section
          className="overflow-hidden rounded-3xl border border-(--app-border) bg-(--app-surface) shadow-(--app-shadow-sm) ring-1 ring-(--app-border-subtle)"
          aria-label="简历列表"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--app-border)/80 px-6 py-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-(--app-text-primary)">
                {viewMode === "overview" ? "最近导入" : "全部列表"}
              </h2>
              <p className="mt-0.5 text-xs text-(--app-text-secondary)">
                {viewMode === "overview"
                  ? `仅展示最近导入的前 ${RECENT_IMPORT_LIMIT} 份 · 当前 ${displayedResumes.length} 份`
                  : `共 ${resumes.length} 份 · 每页 ${listPageSize} 条 · 按导入时间从新到旧`}
              </p>
            </div>
          </div>

          {loading ? (
            <SkeletonTable />
          ) : (
            <>
              <ResumeList
                resumes={displayedResumes}
                loading={loading}
                onView={handleView}
                onDelete={handleDelete}
                emptyTitle={emptyAfterFilter ? "暂无匹配" : undefined}
                emptyDescription={
                  emptyAfterFilter
                    ? "最近导入的简历中没有符合当前筛选或搜索的结果，可切换状态或清空搜索。"
                    : undefined
                }
              />
              {viewMode === "all" ? (
                <ResumePaginationBar
                  totalCount={allResumesSorted.length}
                  currentPage={listPage}
                  pageSize={listPageSize}
                  onPageChange={setListPage}
                  onPageSizeChange={handleListPageSizeChange}
                />
              ) : null}
            </>
          )}
        </section>
      </div>

      <ResumeModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedFile(null);
        }}
        type="upload"
        selectedFile={selectedFile}
        onFileChange={handleFileChange}
        onUpload={handleUpload}
        uploading={uploading}
      />

      <ResumeDetailDrawer
        resume={viewResume}
        loading={viewLoading}
        onOpenChange={(open) => !open && setViewResume(null)}
      />

      <ResumeModal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setSelectedConfigId(null);
        }}
        type="import"
        emailConfigs={emailConfigs}
        loadingConfigs={loadingConfigs}
        selectedConfigId={selectedConfigId}
        onConfigChange={setSelectedConfigId}
        onImport={handleImportFromEmail}
        importing={importing}
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
