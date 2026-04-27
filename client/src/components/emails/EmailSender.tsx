import { useState, useEffect, useRef, useId } from "react";
import {
  Send,
  Mail,
  Phone,
  Search,
  User,
  FileText,
  Check,
  Settings,
  ChevronDown,
  X,
  Loader2,
} from "lucide-react";
import {
  getEmailTemplates,
  sendEmails,
  getEmailRecipients,
} from "../../api/email-template";
import { getEmailConfigs } from "../../api/email";
import toast from "../../utils/toast";
import type { EmailTemplate, EmailRecipient } from "../../types/email-template";
import type { EmailConfig } from "../../types/email";

// ─── 常量 ────────────────────────────────────────────────────────────────

const CARD =
  "overflow-hidden rounded-3xl border border-(--app-border) bg-(--app-surface) shadow-(--app-shadow-sm) ring-1 ring-(--app-border-subtle)";

/** 列表行状态：简洁字牌（无圆点、无描边，靠浅色底区分） */
const STATUS_META = {
  pending: {
    pill: "bg-(--app-warning-soft) text-(--app-warning)",
    label: "待筛选",
  },
  passed: {
    pill: "bg-(--app-success-soft) text-(--app-success)",
    label: "已通过",
  },
  rejected: {
    pill: "bg-(--app-danger-soft) text-(--app-danger)",
    label: "已拒绝",
  },
  sent: {
    pill: "bg-(--app-success-soft) text-(--app-success)",
    label: "发送成功",
  },
} as const;

const STATUS_FILTERS = [
  { value: "all" as const, label: "全部" },
  { value: "pending" as const, label: "待筛选" },
  { value: "passed" as const, label: "已通过" },
  { value: "rejected" as const, label: "已拒绝" },
  /** 后端 last_email_sent_at 有值：曾群发邮件成功 */
  { value: "sent" as const, label: "发送成功" },
];

const READY_STEPS = [
  { key: "account", msg: "发件邮箱" },
  { key: "subject", msg: "主题" },
  { key: "body", msg: "正文" },
  { key: "recipients", msg: "收件人" },
] as const;

type SendForm = {
  templateId: number;
  candidateIds: number[];
  subject: string;
  body: string;
  fromEmailId: number;
};

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

// ─── 子组件 ──────────────────────────────────────────────────────────────

function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  label,
}: {
  value: number | string;
  onChange: (v: number) => void;
  options: { value: number; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  label?: React.ReactNode;
}) {
  const uid = useId();
  const id = `sel-${uid.replace(/:/g, "")}`;
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-(--app-text-secondary)">
          {label}
        </label>
      )}
      {/* 仅相对 select 定位，避免 top-1/2 把 label 高度算进去导致箭头偏上 */}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          aria-label={typeof label === "string" ? label : undefined}
          className="w-full appearance-none rounded-2xl border border-(--app-border) bg-(--app-surface) px-4 py-2.5 pr-9 text-sm text-(--app-text-primary) shadow-sm ring-1 ring-inset ring-(--app-border) transition-all focus:border-(--app-primary) focus:outline-none focus:ring-2 focus:ring-(--app-ring) disabled:cursor-not-allowed disabled:bg-(--app-surface-raised) disabled:text-(--app-text-muted)"
        >
          {placeholder && (
            <option value={0} disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--app-text-muted)"
          strokeWidth={2}
          aria-hidden
        />
      </div>
    </div>
  );
}

function RecipientRow({
  recipient,
  checked,
  onToggle,
}: {
  recipient: EmailRecipient;
  checked: boolean;
  onToggle: () => void;
}) {
  const meta = STATUS_META[recipient.status] ?? STATUS_META.pending;
  const sentTitle =
    recipient.status === "sent" && recipient.lastEmailSentAt
      ? `已群发邮件成功（${new Date(recipient.lastEmailSentAt).toLocaleString("zh-CN")}）`
      : undefined;
  return (
    <label
      className={`group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 transition-all duration-150 sm:gap-3 ${
        checked
          ? "bg-(--app-primary-soft)/90 ring-1 ring-(--app-primary)/20"
          : "hover:bg-(--app-surface)/80"
      }`}
    >
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-150 ${
          checked
            ? "border-(--app-primary) bg-(--app-primary) shadow-sm"
            : "border-(--app-border-strong) bg-(--app-surface) group-hover:border-(--app-primary)/30"
        }`}
      >
        {checked && (
          <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
        )}
      </div>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onToggle} />

      <div className="min-w-0 flex-1">
        {/* 姓名 + 标签行 */}
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-(--app-text-primary)">
            {recipient.name}
          </span>
          <span
            className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium leading-tight tracking-tight ${meta.pill}`}
            title={sentTitle}
          >
            {meta.label}
          </span>
        </div>
        {/* 联系信息 */}
        <div className="mt-0.5 flex min-w-0 items-center gap-2 overflow-hidden text-[11px] text-(--app-text-muted) sm:gap-3">
          {recipient.email && (
            <span className="flex min-w-0 flex-1 items-center gap-1">
              <Mail size={10} strokeWidth={1.5} className="shrink-0" />
              <span className="truncate">{recipient.email}</span>
            </span>
          )}
          {recipient.phone && (
            <span
              className={`flex min-w-0 items-center gap-1 tabular-nums ${
                recipient.email
                  ? "max-w-[40%] shrink-0 sm:max-w-44"
                  : "min-w-0 flex-1"
              }`}
            >
              <Phone size={10} strokeWidth={1.5} className="shrink-0" />
              <span className="truncate">{recipient.phone}</span>
            </span>
          )}
        </div>
      </div>

      {recipient.resumeFile && (
        <FileText
          size={13}
          className="ml-0.5 shrink-0 text-(--app-text-muted)"
          strokeWidth={1.5}
          aria-hidden
        />
      )}
    </label>
  );
}

/** 发送条件检查步骤条 */
function ProgressStepper({
  steps,
}: {
  steps: { ok: boolean; msg: string }[];
}) {
  return (
    <div className="flex items-center gap-2" role="status" aria-label="发送条件">
      {steps.map(({ ok }, i) => (
        <span key={i} className="flex items-center gap-1">
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold transition-colors ${
              ok
                ? "bg-(--app-success-soft) text-(--app-success)"
                : "bg-(--app-border)/80 text-(--app-text-muted)"
            }`}
          >
            {ok ? <Check className="h-2 w-2" strokeWidth={3} /> : i + 1}
          </span>
          {i < steps.length - 1 && (
            <span
              className={`h-px w-4 ${ok ? "bg-(--app-success)" : "bg-(--app-border)"}`}
            />
          )}
        </span>
      ))}
    </div>
  );
}

/** 收件人列表骨架屏 */
function SenderSkeleton() {
  return (
    <div
      className="grid animate-pulse grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch lg:gap-6"
      aria-hidden
    >
      <div className="flex min-h-0 flex-col lg:col-span-7">
        <div className={`${CARD} flex h-full min-h-112 flex-col`}>
          <div className="border-b border-(--app-border) px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-(--app-skeleton)" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-(--app-skeleton)" />
                <div className="h-3 w-20 rounded bg-(--app-skeleton)" />
              </div>
            </div>
          </div>
          <div className="space-y-5 p-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-10 rounded-2xl bg-(--app-skeleton)" />
              <div className="h-10 rounded-2xl bg-(--app-skeleton)" />
            </div>
            <div className="h-10 rounded-2xl bg-(--app-skeleton)" />
            <div className="h-48 rounded-2xl bg-(--app-border)" />
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-col lg:col-span-5">
        <div className={`${CARD} flex h-full min-h-112 flex-col`}>
          <div className="border-b border-(--app-border) px-5 py-4">
            <div className="h-4 w-24 rounded bg-(--app-skeleton)" />
          </div>
          <div className="space-y-3 p-5">
            <div className="h-10 rounded-xl bg-(--app-skeleton)" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 flex-1 rounded-lg bg-(--app-skeleton)" />
              ))}
            </div>
            <div className="h-56 rounded-2xl bg-(--app-border)" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────────────────────

interface EmailSenderProps {
  onRefresh?: () => void;
  initialTemplateId?: number | null;
  onInitialTemplateApplied?: () => void;
  onTemplateCount?: (count: number) => void;
}

export function EmailSender({
  onRefresh,
  initialTemplateId,
  onInitialTemplateApplied,
  onTemplateCount,
}: EmailSenderProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([]);
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [sendForm, setSendForm] = useState<SendForm>({
    templateId: 0,
    candidateIds: [],
    subject: "",
    body: "",
    fromEmailId: 0,
  });

  const appliedInitialIdRef = useRef<number | null>(null);

  // ─── 数据加载 ────────────────────────────────────────────────────────
  const loadRecipients = async () => {
    try {
      const data = await getEmailRecipients();
      setRecipients(data);
    } catch (err) {
      console.error("加载收件人失败:", err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [tpl, cfg] = await Promise.all([getEmailTemplates(), getEmailConfigs()]);
        if (cancelled) return;
        setTemplates(tpl);
        setEmailConfigs(cfg);
        onTemplateCount?.(tpl.length);
        await loadRecipients();
        const def = cfg.find((c) => c.isDefault) ?? cfg[0];
        if (def) setSendForm((p) => ({ ...p, fromEmailId: def.id }));
      } catch (err) {
        if (!cancelled) console.error("加载数据失败:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [onTemplateCount]);

  useEffect(() => {
    if (loading || !initialTemplateId || templates.length === 0) return;
    if (appliedInitialIdRef.current === initialTemplateId) return;
    const tpl = templates.find((t) => t.id === initialTemplateId);
    if (tpl) {
      setSendForm((p) => ({
        ...p,
        templateId: tpl.id,
        subject: tpl.subject,
        body: tpl.body,
      }));
      appliedInitialIdRef.current = initialTemplateId;
      onInitialTemplateApplied?.();
    }
  }, [loading, initialTemplateId, templates, onInitialTemplateApplied]);

  // ─── 派生数据 ────────────────────────────────────────────────────────
  const stats = {
    all: recipients.length,
    pending: recipients.filter((r) => r.status === "pending").length,
    passed: recipients.filter((r) => r.status === "passed").length,
    rejected: recipients.filter((r) => r.status === "rejected").length,
    sent: recipients.filter((r) => r.status === "sent").length,
  };

  const filteredRecipients = recipients
    .filter((r) => {
      if (statusFilter === "all") return true;
      return r.status === statusFilter;
    })
    .filter((r) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.phone?.includes(q)
      );
    });

  const selectedCount = sendForm.candidateIds.length;
  const allFilteredSelected =
    filteredRecipients.length > 0 &&
    filteredRecipients.every((r) => sendForm.candidateIds.includes(r.id));

  const readySteps = READY_STEPS.map((s) => ({
    ok:
      s.key === "account"
        ? emailConfigs.length > 0
        : s.key === "subject"
          ? !!sendForm.subject.trim()
          : s.key === "body"
            ? !!sendForm.body.trim()
            : selectedCount > 0,
    msg: s.msg,
  }));

  const canSend =
    emailConfigs.length > 0 &&
    !!sendForm.subject.trim() &&
    !!sendForm.body.trim() &&
    selectedCount > 0 &&
    !sending;

  // ─── 事件处理 ────────────────────────────────────────────────────────
  const handleSelectTemplate = (templateId: number) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setSendForm((p) => ({
        ...p,
        templateId: tpl.id,
        subject: tpl.subject,
        body: tpl.body,
      }));
    }
  };

  const handleToggleAll = () => {
    setSendForm((p) => ({
      ...p,
      candidateIds:
        allFilteredSelected
          ? p.candidateIds.filter((id) => !filteredRecipients.some((r) => r.id === id))
          : [...new Set([...p.candidateIds, ...filteredRecipients.map((r) => r.id)])],
    }));
  };

  const handleSend = async () => {
    if (!sendForm.fromEmailId) { toast.error("请选择发件邮箱"); return; }
    if (!sendForm.subject.trim()) { toast.error("请填写邮件主题"); return; }
    if (!sendForm.body.trim()) { toast.error("请填写邮件正文"); return; }
    if (selectedCount === 0) { toast.error("请选择收件人"); return; }

    const batch = [...sendForm.candidateIds];
    setSending(true);
    try {
      const result = await sendEmails({
        templateId: sendForm.templateId || undefined,
        candidateIds: batch,
        subject: sendForm.subject,
        body: sendForm.body,
        fromEmailId: sendForm.fromEmailId,
      });

      toast.success(result.success ? result.message : `发送完成：成功 ${result.sentCount} 封`);
      setSendForm((p) => ({
        ...p,
        candidateIds: [],
        subject: "",
        body: "",
        templateId: 0,
      }));
      await loadRecipients();
      onRefresh?.();
    } catch (err) {
      console.error("发送失败:", err);
      toast.error(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSending(false);
    }
  };

  // ─── 渲染 ────────────────────────────────────────────────────────────
  if (loading) return <SenderSkeleton />;

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-12 lg:items-stretch lg:gap-6">
      {/* ── 左侧：邮件撰写（与右侧收件卡片同高） ── */}
      <section className="flex min-h-0 flex-col lg:col-span-7">
        <div className={`${CARD} flex h-full min-h-0 flex-col`}>
          {/* 卡片头部：简洁图标 + 标题 + 发送按钮 */}
          <div className="flex shrink-0 items-center justify-between border-b border-(--app-border) bg-(--app-surface-raised)/80 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-(--app-primary) to-(--app-primary-hover) text-(--app-surface) shadow-sm">
                <Mail className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-(--app-text-primary)">撰写邮件</h1>
                <p className="text-xs text-(--app-text-muted)">
                  {templates.length > 0
                    ? `${templates.length} 个模板可用`
                    : "暂无模板"}
                </p>
              </div>
            </div>

            {/* 发送按钮（头部始终可见） */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-(--app-primary) to-(--app-primary-hover) px-5 py-2.5 text-sm font-semibold text-(--app-surface) shadow-sm transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />发送中…</>
              ) : selectedCount > 0 ? (
                <><Send className="h-4 w-4" strokeWidth={2} />发送给 {selectedCount} 人</>
              ) : (
                <><Send className="h-4 w-4 opacity-60" strokeWidth={2} />选择收件人后发送</>
              )}
            </button>
          </div>

          {/* 中间可滚动 + 底部发送条件贴底，避免大块留白 */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 pt-6 [scrollbar-gutter:stable]">
              <div className="shrink-0 space-y-6">
                {/* 发件设置：模板 + 发件邮箱（横向两列） */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <NativeSelect
                    label="邮件模板"
                    value={sendForm.templateId}
                    onChange={handleSelectTemplate}
                    placeholder="不套用模板"
                    options={templates.map((t) => ({
                      value: t.id,
                      label: t.name,
                    }))}
                  />
                  <NativeSelect
                    label={
                      <span>
                        发件邮箱 <span className="text-(--app-danger)">*</span>
                      </span>
                    }
                    value={sendForm.fromEmailId}
                    onChange={(v) => setSendForm((p) => ({ ...p, fromEmailId: v }))}
                    placeholder="请选择发件邮箱"
                    options={emailConfigs.map((c) => ({
                      value: c.id,
                      label: `${c.email}${c.isDefault ? "（默认）" : ""}`,
                    }))}
                  />
                </div>

                {emailConfigs.length === 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-(--app-warning-soft) bg-(--app-warning-soft)/60 px-4 py-2.5 text-xs text-(--app-warning)">
                    <Settings size={13} strokeWidth={1.75} className="shrink-0" />
                    请先在「设置 → 邮箱配置」中添加发件邮箱。
                  </div>
                )}

                {/* 邮件主题 */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-(--app-text-secondary)">
                    邮件主题 <span className="text-(--app-danger)">*</span>
                  </label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--app-text-muted)"
                      strokeWidth={1.75}
                    />
                    <input
                      type="text"
                      value={sendForm.subject}
                      onChange={(e) =>
                        setSendForm((p) => ({ ...p, subject: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) py-2.5 pl-11 pr-4 text-sm text-(--app-text-primary) shadow-sm ring-1 ring-inset ring-(--app-border) transition-all focus:border-(--app-primary) focus:outline-none focus:ring-2 focus:ring-(--app-ring)"
                      placeholder="支持变量，如 {{name}}、{{position}}"
                    />
                  </div>
                </div>
              </div>

              {/* 正文区吃掉卡片剩余高度，减少「发送条件」下方空白感 */}
              <div className="mt-6 flex min-h-0 flex-1 flex-col pb-2">
                <label className="mb-1.5 block shrink-0 text-xs font-semibold text-(--app-text-secondary)">
                  邮件正文 <span className="text-(--app-danger)">*</span>
                </label>
                <textarea
                  value={sendForm.body}
                  onChange={(e) =>
                    setSendForm((p) => ({ ...p, body: e.target.value }))
                  }
                  className="min-h-44 w-full flex-1 resize-y overflow-y-auto rounded-2xl border border-(--app-border) bg-(--app-surface) px-4 py-3 font-mono text-sm leading-relaxed text-(--app-text-primary) shadow-sm ring-1 ring-inset ring-(--app-border) transition-all focus:border-(--app-primary) focus:outline-none focus:ring-2 focus:ring-(--app-ring)"
                  placeholder={"尊敬的 {{name}} 您好：\n\n感谢您投递我们公司的 {{position}} 职位…"}
                />
              </div>
            </div>

            {/* 底部就绪步骤条：固定在卡片底部 */}
            <div className="flex shrink-0 items-center justify-between border-t border-(--app-border) bg-(--app-surface-raised)/40 px-6 py-3">
              <span className="text-xs text-(--app-text-muted)">发送条件</span>
              <ProgressStepper steps={readySteps} />
            </div>
          </div>
        </div>
      </section>

      {/* ── 右侧：收件人列表（与左侧撰写区同高，列表区自适应撑满） ── */}
      <aside className="flex min-h-0 flex-col lg:col-span-5">
        <div className={`flex h-full min-h-0 flex-col ${CARD}`}>
          {/* 头部 */}
          <div className="shrink-0 border-b border-(--app-border) bg-(--app-surface-raised)/80 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-inset ring-blue-400/20">
                  <User className="h-4 w-4 text-blue-600" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-(--app-text-primary)">收件人</h2>
                  <p className="text-xs text-(--app-text-muted)">
                    {selectedCount > 0
                      ? `已选 ${selectedCount} / ${stats.all} 人`
                      : `${stats.all} 位候选人`}
                  </p>
                </div>
              </div>
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSendForm((p) => ({ ...p, candidateIds: [] }))
                  }
                  className="rounded-lg border border-(--app-border) bg-(--app-surface) px-2.5 py-1.5 text-xs font-medium text-(--app-text-secondary) shadow-sm transition-colors hover:border-(--app-border-strong) hover:text-(--app-text-primary)"
                >
                  清空
                </button>
              )}
            </div>
          </div>

          {/* 搜索 + 筛选 */}
          <div className="shrink-0 space-y-3 px-5 py-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--app-text-muted)"
                strokeWidth={1.75}
              />
              <input
                type="search"
                placeholder="搜索姓名、邮箱或电话"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-raised)/60 py-2 pl-11 pr-9 text-sm text-(--app-text-primary) transition-all focus:border-(--app-primary) focus:bg-(--app-surface) focus:outline-none focus:ring-2 focus:ring-(--app-ring)"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="清除搜索"
                  className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-(--app-text-muted) transition-colors hover:bg-(--app-border)/60 hover:text-(--app-text-secondary)"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
            </div>

            {/* 状态筛选标签 */}
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map(({ value, label }) => {
                const count =
                  value === "all"
                    ? stats.all
                    : stats[value as keyof typeof stats];
                const active = statusFilter === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      active
                        ? "bg-(--app-primary) text-(--app-surface) shadow-sm"
                        : "border border-(--app-border)/90 bg-(--app-surface) text-(--app-text-secondary) hover:border-(--app-primary)/20 hover:bg-(--app-primary-soft)/50"
                    }`}
                  >
                    {label}
                    <span className={active ? "text-(--app-primary)/20" : "text-(--app-text-muted)"}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 收件人列表：占满卡片剩余高度，内部滚动 */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-2xl">
            {filteredRecipients.length === 0 ? (
              <div className="flex min-h-48 flex-1 flex-col items-center justify-center px-4 py-14 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-(--app-skeleton) shadow-sm ring-1 ring-(--app-border)/80">
                  <User className="h-6 w-6 text-(--app-text-muted)" strokeWidth={1.25} />
                </div>
                <p className="text-sm font-medium text-(--app-text-secondary)">
                  {searchQuery
                    ? "没有匹配的候选人"
                    : statusFilter === "sent"
                      ? "暂无发送成功记录"
                      : "暂无候选人"}
                </p>
                <p className="mt-1 max-w-[200px] text-xs text-(--app-text-muted)">
                  {searchQuery
                    ? "更换关键词或筛选条件"
                    : statusFilter === "sent"
                      ? "群发邮件发送成功后会计入此处，刷新页面仍会保留"
                      : "在简历管理中导入候选人"}
                </p>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                {/* 全选操作栏 */}
                <div className="flex shrink-0 items-center justify-between border-b border-(--app-border) bg-(--app-surface)/90 px-3 py-2.5 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={handleToggleAll}
                    className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] font-semibold text-(--app-primary-hover) transition-colors hover:bg-(--app-primary-soft)"
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        allFilteredSelected
                          ? "border-(--app-primary) bg-(--app-primary) text-(--app-surface)"
                          : "border-(--app-border-strong) bg-(--app-surface)"
                      }`}
                    >
                      {allFilteredSelected && (
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      )}
                    </span>
                    {allFilteredSelected ? "取消全选" : "全选"}
                  </button>
                  <span className="text-[10px] tabular-nums text-(--app-text-muted)">
                    {filteredRecipients.length} 条
                  </span>
                </div>

                {/* 列表 */}
                <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-2 pr-1 [scrollbar-gutter:stable]">
                  {filteredRecipients.map((r) => (
                    <RecipientRow
                      key={r.id}
                      recipient={r}
                      checked={sendForm.candidateIds.includes(r.id)}
                      onToggle={() =>
                        setSendForm((p) => ({
                          ...p,
                          candidateIds: p.candidateIds.includes(r.id)
                            ? p.candidateIds.filter((x) => x !== r.id)
                            : [...p.candidateIds, r.id],
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
