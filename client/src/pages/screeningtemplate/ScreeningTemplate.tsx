import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import toast from "../../utils/toast";
import { parseServerDate } from "../../utils/format";
import {
  Plus,
  Trash2,
  Copy,
  Star,
  StarOff,
  X,
  Clock,
  Hash,
  Filter,
  Mail,
  Eye,
  Send,
  Pencil,
} from "lucide-react";
import type { PreFilterConfig } from "../../components/aiscreening/preFilterUtils";
import {
  getDefaultPreFilter,
  isEmptyPreFilter,
} from "../../components/aiscreening/preFilterUtils";
import type { ScreeningTemplate } from "../../api/screeningTemplate";
import {
  loadTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setDefaultTemplate,
  duplicateTemplate,
} from "../../api/screeningTemplate";

// ─── 条件预览 ──────────────────────────────────────────────────

function ConditionPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-(--app-primary-soft) px-3 py-1 text-xs font-medium text-(--app-primary) ring-1 ring-(--app-border)">
      <span className="min-w-0 break-words font-semibold">{value}</span>
      <span className="shrink-0 text-(--app-primary)/50">·</span>
      <span className="shrink-0">{label}</span>
    </span>
  );
}

function ConditionSummary({ config }: { config: PreFilterConfig }) {
  if (isEmptyPreFilter(config)) {
    return (
      <span className="text-xs italic text-(--app-text-muted)">
        无过滤条件（全部通过）
      </span>
    );
  }
  const pills: { label: string; value: string }[] = [];
  if (config.keywords.trim()) {
    const kws = config.keywords
      .split(/[,，\s\n]+/)
      .map((k) => k.trim())
      .filter(Boolean);
    const preview =
      kws.length > 3
        ? `${kws.slice(0, 3).join(", ")} 等${kws.length}个`
        : kws.join(", ");
    pills.push({ label: "关键词", value: preview });
  }
  if (config.keywordMode === "and") {
    pills.push({ label: "匹配", value: "AND" });
  }
  if (config.minScore != null) {
    pills.push({ label: "最低分", value: `${config.minScore}分` });
  }
  if (config.dateFrom.trim()) {
    pills.push({ label: "导入从", value: config.dateFrom });
  }
  if (config.dateTo.trim()) {
    pills.push({ label: "导入至", value: config.dateTo });
  }
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
      {pills.map((p) => (
        <ConditionPill key={p.label} label={p.label} value={p.value} />
      ))}
    </div>
  );
}

function getConditionSummaryLine(config: PreFilterConfig): string {
  if (isEmptyPreFilter(config)) {
    return "无过滤条件（全部通过）";
  }
  const parts: string[] = [];
  if (config.keywords.trim()) {
    const kws = config.keywords
      .split(/[,，\s\n]+/)
      .map((k) => k.trim())
      .filter(Boolean);
    const text =
      kws.length > 6
        ? `${kws.slice(0, 6).join("、")}…共${kws.length}个`
        : kws.join("、");
    parts.push(text);
  }
  if (config.keywordMode === "and") {
    parts.push("全部满足");
  }
  if (config.minScore != null) {
    parts.push(`最低分 ${config.minScore}`);
  }
  if (config.dateFrom.trim()) {
    parts.push(`导入从 ${config.dateFrom}`);
  }
  if (config.dateTo.trim()) {
    parts.push(`导入至 ${config.dateTo}`);
  }
  return parts.join(" · ");
}

function formatTemplateDateZh(iso: string): string {
  const d = parseServerDate(iso);
  if (!d) return "—";
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── 单弹窗内：预筛选表单（与 AI 筛选页 PreFilterModal 字段一致）────────

function PreFilterEditorFields({
  config,
  onConfigChange,
}: {
  config: PreFilterConfig;
  onConfigChange: (next: PreFilterConfig) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="tpl-editor-keywords"
          className="mb-2 block text-sm font-medium text-(--app-text-primary)"
        >
          关键词
        </label>
        <textarea
          id="tpl-editor-keywords"
          value={config.keywords}
          onChange={(e) =>
            onConfigChange({ ...config, keywords: e.target.value })
          }
          placeholder="多个关键词用逗号、空格或换行分隔。例：React, 3年, 硕士"
          rows={4}
          className="w-full resize-y rounded-xl border border-(--app-border) bg-(--app-surface-raised)/60 px-4 py-3 text-sm leading-relaxed text-(--app-text-primary) placeholder:text-(--app-text-muted) focus:border-(--app-primary) focus:bg-(--app-surface) focus:outline-none focus:ring-2 focus:ring-(--app-ring)"
        />
        <p className="mt-1.5 text-xs text-(--app-text-secondary)">
          在姓名、邮箱、简历内容、AI 摘要中搜索
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-(--app-text-primary)">
          关键词匹配
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onConfigChange({ ...config, keywordMode: "or" })}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
              config.keywordMode === "or"
                ? "border-(--app-primary)/40 bg-(--app-primary-soft) text-(--app-text-primary) ring-1 ring-(--app-border)"
                : "border-(--app-border) bg-(--app-surface) text-(--app-text-secondary) hover:bg-(--app-surface-raised)"
            }`}
          >
            满足任一
          </button>
          <button
            type="button"
            onClick={() => onConfigChange({ ...config, keywordMode: "and" })}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
              config.keywordMode === "and"
                ? "border-(--app-primary)/40 bg-(--app-primary-soft) text-(--app-text-primary) ring-1 ring-(--app-border)"
                : "border-(--app-border) bg-(--app-surface) text-(--app-text-secondary) hover:bg-(--app-surface-raised)"
            }`}
          >
            全部满足
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="tpl-editor-minScore"
          className="mb-2 block text-sm font-medium text-(--app-text-primary)"
        >
          最低匹配分
        </label>
        <input
          id="tpl-editor-minScore"
          type="number"
          min={0}
          max={100}
          value={config.minScore ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onConfigChange({
              ...config,
              minScore: v === "" ? null : Math.min(100, Math.max(0, Number(v))),
            });
          }}
          placeholder="不填则不限制"
          className="h-11 w-full rounded-xl border border-(--app-border) bg-(--app-surface) px-3.5 text-sm text-(--app-text-primary) placeholder:text-(--app-text-muted) focus:border-(--app-primary) focus:outline-none focus:ring-2 focus:ring-(--app-ring)"
        />
        <p className="mt-1 text-xs text-(--app-text-secondary)">
          仅对已有 AI 评分的简历生效
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="tpl-editor-dateFrom"
            className="mb-1.5 block text-xs font-medium text-(--app-text-secondary)"
          >
            导入时间起
          </label>
          <input
            id="tpl-editor-dateFrom"
            type="date"
            value={config.dateFrom}
            onChange={(e) =>
              onConfigChange({ ...config, dateFrom: e.target.value })
            }
            className="h-10 w-full rounded-xl border border-(--app-border) bg-(--app-surface) px-3 text-sm text-(--app-text-primary) focus:border-(--app-primary) focus:outline-none focus:ring-2 focus:ring-(--app-ring)"
          />
        </div>
        <div>
          <label
            htmlFor="tpl-editor-dateTo"
            className="mb-1.5 block text-xs font-medium text-(--app-text-secondary)"
          >
            导入时间止
          </label>
          <input
            id="tpl-editor-dateTo"
            type="date"
            value={config.dateTo}
            onChange={(e) =>
              onConfigChange({ ...config, dateTo: e.target.value })
            }
            className="h-10 w-full rounded-xl border border-(--app-border) bg-(--app-surface) px-3 text-sm text-(--app-text-primary) focus:border-(--app-primary) focus:outline-none focus:ring-2 focus:ring-(--app-ring)"
          />
        </div>
      </div>
    </div>
  );
}

// ─── 模板编辑器：单弹窗（标题区 + 模版名称 + 预筛选条件）──────────────

type EditorMode = "create" | "edit";

interface EditorModalProps {
  open: boolean;
  mode: EditorMode;
  initial?: ScreeningTemplate;
  onClose: () => void;
  onSave: (name: string, config: PreFilterConfig) => void;
}

function EditorModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
}: EditorModalProps) {
  const [name, setName] = useState(() =>
    mode === "edit" && initial ? initial.name : "",
  );
  const [config, setConfig] = useState<PreFilterConfig>(() =>
    mode === "edit" && initial ? { ...initial.config } : getDefaultPreFilter(),
  );
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => nameInputRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (mode === "edit" && initial) {
      setName(initial.name);
      setConfig({ ...initial.config });
    } else {
      setName("");
      setConfig(getDefaultPreFilter());
    }
  }, [mode, initial]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("请输入模版名称");
      nameInputRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSave(name.trim(), config);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "保存失败";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void handleSave();
  };

  const handleClearConditions = () => {
    setConfig(getDefaultPreFilter());
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tpl-editor-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-(--app-overlay) backdrop-blur-sm"
        aria-hidden
      />
      <div className="relative flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-(--app-border) bg-(--app-surface) shadow-(--app-shadow) sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-(--app-border-subtle) bg-(--app-surface-raised)/80 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-(--app-primary) to-(--app-primary-hover) text-white shadow-md shadow-(--app-primary)/25">
              <Filter className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2
                id="tpl-editor-modal-title"
                className="truncate text-base font-semibold text-(--app-text-primary)"
              >
                自定义预筛选条件
              </h2>
              <p className="truncate text-xs text-(--app-text-secondary)">
                先按条件筛一遍，再进行 AI 筛选
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2.5 text-(--app-text-secondary) transition-colors hover:bg-(--app-surface) hover:text-(--app-text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-surface)"
            title="关闭"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="tpl-editor-name"
                className="mb-2 block text-sm font-medium text-(--app-text-primary)"
              >
                模版名称
              </label>
              <input
                ref={nameInputRef}
                id="tpl-editor-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="如：技术岗初筛、上海地区"
                maxLength={60}
                className="h-11 w-full rounded-xl border border-(--app-border) bg-(--app-surface) px-3.5 text-sm text-(--app-text-primary) placeholder:text-(--app-text-muted) focus:border-(--app-primary) focus:outline-none focus:ring-2 focus:ring-(--app-ring)"
              />
            </div>
            <PreFilterEditorFields config={config} onConfigChange={setConfig} />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 border-t border-(--app-border-subtle) bg-(--app-surface-raised)/90 px-4 py-3.5 sm:px-5">
          <button
            type="button"
            onClick={handleClearConditions}
            disabled={saving}
            className="rounded-xl border border-(--app-border) bg-(--app-surface) px-4 py-2.5 text-sm font-medium text-(--app-text-primary) shadow-sm transition-colors hover:bg-(--app-surface-raised) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-border-strong) disabled:opacity-50"
          >
            清空
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-(--app-border) bg-(--app-surface) px-4 py-2.5 text-sm font-medium text-(--app-text-primary) shadow-sm transition-colors hover:bg-(--app-surface-raised) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-border-strong) disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-(--app-primary) px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-(--app-primary)/25 transition-colors hover:bg-(--app-primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring-strong) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-surface) disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {mode === "create" ? "创建模版" : "保存修改"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 条件预览弹窗 ────────────────────────────────────────────────

function TemplatePreviewModal({
  template,
  open,
  onClose,
}: {
  template: ScreeningTemplate | null;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !template) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tpl-preview-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-(--app-overlay) backdrop-blur-sm"
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-t-2xl border border-(--app-border) bg-(--app-surface) p-5 shadow-(--app-shadow) sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-(--app-text-muted)">模版名称</p>
            <h2
              id="tpl-preview-title"
              className="mt-0.5 truncate text-lg font-semibold text-(--app-text-primary)"
            >
              {template.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-(--app-text-secondary) transition-colors hover:bg-(--app-surface-raised) hover:text-(--app-text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring)"
            title="关闭"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mb-2 text-xs font-medium text-(--app-text-secondary)">
          预筛条件
        </p>
        <ConditionSummary config={template.config} />
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-(--app-primary) py-2.5 text-sm font-semibold text-white transition-colors hover:bg-(--app-primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring-strong)"
        >
          关闭
        </button>
      </div>
    </div>
  );
}

// ─── 模板卡片（列表项视觉参考设计稿）──────────────────────────────

interface TemplateCardProps {
  template: ScreeningTemplate;
  onEdit: (t: ScreeningTemplate) => void;
  onDuplicate: (t: ScreeningTemplate) => void;
  onDelete: (t: ScreeningTemplate) => void;
  onSetDefault: (t: ScreeningTemplate) => void;
  onApply: (t: ScreeningTemplate) => void;
}

function TemplateCardIconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`rounded-lg p-2 text-(--app-text-muted) transition-colors hover:bg-(--app-primary-soft) hover:text-(--app-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring) ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function TemplateCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-(--app-ai-border) bg-(--app-surface) p-5 shadow-(--app-shadow-sm)">
      {/* 顶部：图标 + 名称 + 按钮 */}
      <div className="flex gap-4">
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-(--app-skeleton)" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5">
              <div className="h-3 w-16 animate-pulse rounded bg-(--app-skeleton)" />
              <div className="h-5 w-36 animate-pulse rounded bg-(--app-skeleton)" />
              <div className="h-3 w-24 animate-pulse rounded bg-(--app-skeleton)" />
            </div>
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-8 animate-pulse rounded-lg bg-(--app-skeleton)" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 条件概要 */}
      <div className="mt-5 space-y-1.5">
        <div className="h-3 w-16 animate-pulse rounded bg-(--app-skeleton)" />
        <div className="h-4 w-full animate-pulse rounded bg-(--app-skeleton)" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-(--app-skeleton)" />
      </div>

      <hr className="my-5 border-0 border-t border-(--app-border-subtle)" />

      {/* 底部按钮 */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 animate-pulse rounded bg-(--app-skeleton)" />
        <div className="h-9 w-24 animate-pulse rounded-full bg-(--app-skeleton)" />
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDuplicate,
  onDelete,
  onSetDefault,
  onApply,
}: TemplateCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const summaryLine = getConditionSummaryLine(template.config);
  const createdZh = formatTemplateDateZh(template.createdAt);

  return (
    <>
      <article className="group relative overflow-hidden rounded-2xl border border-(--app-ai-border) bg-(--app-surface) p-5 shadow-(--app-shadow-sm) transition-shadow hover:shadow-(--app-shadow-primary)">
        <div
          className="pointer-events-none absolute right-0 top-0 size-0 border-l-22 border-l-transparent border-t-22 border-t-(--app-primary)"
          aria-hidden
        />

        <div className="relative flex gap-4 pr-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-b from-(--app-primary) to-(--app-primary-hover) text-white shadow-md shadow-(--app-primary)/25">
            <Mail className="h-5 w-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-(--app-text-muted)">模板名称</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-bold text-(--app-text-primary)">
                    {template.name}
                  </h3>
                  {template.isDefault && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-(--app-warning-soft) px-2 py-0.5 text-[10px] font-bold text-(--app-warning) ring-1 ring-(--app-border)">
                      <Star
                        className="h-2.5 w-2.5 fill-(--app-warning)"
                        aria-hidden
                      />
                      默认
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-(--app-text-muted)">
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {createdZh}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <TemplateCardIconButton
                  label="编辑模版"
                  onClick={() => onEdit(template)}
                >
                  <Pencil className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </TemplateCardIconButton>
                <TemplateCardIconButton
                  label="复制模版"
                  onClick={() => onDuplicate(template)}
                >
                  <Copy className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </TemplateCardIconButton>
                {!template.isDefault && (
                  <TemplateCardIconButton
                    label="设为默认模版"
                    onClick={() => onSetDefault(template)}
                  >
                    <StarOff
                      className="h-[18px] w-[18px]"
                      strokeWidth={1.75}
                    />
                  </TemplateCardIconButton>
                )}
                <TemplateCardIconButton
                  label="删除模版"
                  onClick={() => onDelete(template)}
                  className="hover:bg-(--app-danger-soft) hover:text-(--app-danger)"
                >
                  <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </TemplateCardIconButton>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-5 min-w-0">
          <p className="text-xs text-(--app-text-muted)">条件概要</p>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-(--app-text-primary)">
            {summaryLine}
          </p>
        </div>

        <hr className="relative my-5 border-0 border-t border-(--app-border-subtle)" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 self-start rounded-lg text-sm text-(--app-text-secondary) transition-colors hover:text-(--app-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-surface)"
          >
            <Eye className="h-4 w-4 shrink-0" aria-hidden />
            点击预览
          </button>
          <button
            type="button"
            onClick={() => onApply(template)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-(--app-primary) px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-(--app-primary)/30 transition-colors hover:bg-(--app-primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring-strong) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-surface)"
          >
            <Send className="h-4 w-4 shrink-0" aria-hidden />
            去使用
          </button>
        </div>
      </article>

      <TemplatePreviewModal
        template={template}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}

// ─── 主页面 ─────────────────────────────────────────────────────

export default function ScreeningTemplate() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ScreeningTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editingTemplate, setEditingTemplate] = useState<
    ScreeningTemplate | undefined
  >();
  const [confirmDelete, setConfirmDelete] = useState<ScreeningTemplate | null>(
    null,
  );

  const refresh = useCallback(async () => {
    try {
      const list = await loadTemplates();
      setTemplates(list);
      setError(null);
    } catch {
      setError("加载模版失败，请刷新重试");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = () => {
    setEditingTemplate(undefined);
    setEditorMode("create");
    setEditorOpen(true);
  };

  const handleEdit = (t: ScreeningTemplate) => {
    setEditingTemplate(t);
    setEditorMode("edit");
    setEditorOpen(true);
  };

  const handleSave = async (name: string, config: PreFilterConfig) => {
    try {
      if (editorMode === "create") {
        await createTemplate(name, config);
        toast.success("模版创建成功");
      } else if (editingTemplate) {
        const updated = await updateTemplate(editingTemplate.id, {
          name,
          config,
        });
        setEditingTemplate(updated);
        toast.success("模版已保存");
      }
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "保存失败";
      toast.error(msg);
    }
  };

  const handleDuplicate = async (t: ScreeningTemplate) => {
    try {
      await duplicateTemplate(t.id, `${t.name} (副本)`);
      toast.success("模版已复制");
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "复制失败");
    }
  };

  const handleDelete = (t: ScreeningTemplate) => setConfirmDelete(t);

  const confirmDeleteTemplate = async () => {
    if (!confirmDelete) return;
    try {
      await deleteTemplate(confirmDelete.id);
      toast.success("模版已删除");
      setConfirmDelete(null);
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    }
  };

  const handleSetDefault = async (t: ScreeningTemplate) => {
    await setDefaultTemplate(t.id);
    toast.success(`已将「${t.name}」设为默认模版`);
    await refresh();
  };

  const handleApply = (t: ScreeningTemplate) => {
    localStorage.setItem("active-screening-template", String(t.id));
    toast.success(`已将「${t.name}」设为当前筛选条件`, {
      description: "正在跳转到 AI 筛选页面…",
    });
    navigate("/app/aiscreening");
  };

  return (
    <div className="relative min-h-full">
      {/* 背景 */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--app-primary-soft),transparent)]"
        aria-hidden
      />

      <div className="mx-auto max-w-[1360px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-(--app-text-muted)">
              Templates
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-(--app-text-primary)">
              筛选模版
            </h1>
            <p className="mt-1 text-sm text-(--app-text-secondary)">
              保存常用的预筛选条件组合，一键应用到 AI 筛选流程中。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-(--app-primary) px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-(--app-primary)/30 transition-colors hover:bg-(--app-primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring-strong) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-bg)"
            >
              <Plus className="h-4 w-4" aria-hidden />
              新建模版
            </button>
          </div>
        </header>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <TemplateCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-(--app-danger)/30 bg-(--app-danger-soft) px-6 py-16 text-center">
            <p className="text-sm font-medium text-(--app-danger)">
              {error}
            </p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);
                refresh().finally(() => setLoading(false));
              }}
              className="mt-3 rounded-xl border border-(--app-border) bg-(--app-surface) px-4 py-2 text-xs font-medium text-(--app-danger) shadow-sm hover:bg-(--app-danger-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-danger)/40"
            >
              重新加载
            </button>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-(--app-border) bg-(--app-surface-raised)/50 px-6 py-24 text-center ring-1 ring-inset ring-(--app-border-subtle)">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-(--app-surface) shadow-sm ring-1 ring-(--app-border)">
              <Hash
                className="h-7 w-7 text-(--app-text-muted)"
                strokeWidth={1.25}
              />
            </div>
            <p className="text-sm font-medium text-(--app-text-primary)">
              还没有筛选模版
            </p>
            <p className="mt-1.5 max-w-[280px] text-xs text-(--app-text-secondary)">
              创建第一个模版，保存你的常用筛选条件组合
            </p>
            <button
              type="button"
              onClick={handleCreate}
              className="mt-6 rounded-full bg-(--app-primary) px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-(--app-primary)/30 transition-colors hover:bg-(--app-primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring-strong) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-bg)"
            >
              创建第一个模版
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm text-(--app-text-secondary)">
              共 {templates.length} 个模板
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
                onApply={handleApply}
              />
            ))}
            </div>
          </div>
        )}
      </div>

      {/* 仅打开时挂载 + key 保证每次打开都重新挂载 */}
      {editorOpen && (
        <EditorModal
          key={`${editorMode}-${editingTemplate?.id ?? "new"}`}
          open
          mode={editorMode}
          initial={editingTemplate}
          onClose={() => setEditorOpen(false)}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-label="确认删除"
        >
          <div
            className="absolute inset-0 bg-(--app-overlay) backdrop-blur-sm"
            aria-hidden
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-(--app-border) bg-(--app-surface) p-6 shadow-(--app-shadow)">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-(--app-danger-soft) ring-1 ring-(--app-border)">
              <Trash2 className="h-6 w-6 text-(--app-danger)" />
            </div>
            <h3 className="text-base font-semibold text-(--app-text-primary)">
              删除模版「{confirmDelete.name}」？
            </h3>
            <p className="mt-2 text-sm text-(--app-text-secondary)">
              此操作不可撤销。已引用的位置将保留引用，但不会再自动更新。
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-(--app-border) bg-(--app-surface) px-4 py-2.5 text-sm font-medium text-(--app-text-primary) shadow-sm transition-colors hover:bg-(--app-surface-raised) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-border-strong)"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDeleteTemplate}
                className="rounded-xl bg-(--app-danger) px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-(--app-danger)/20 transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-danger)/50 focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-surface)"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
