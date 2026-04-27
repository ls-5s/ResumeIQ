import {
  Mail,
  Phone,
  Calendar,
  Eye,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { Resume } from "../../../types/resume";

type ResumeStatus = Resume["status"];

const STATUS_ROW: Record<
  ResumeStatus,
  { label: string; badge: string; Icon: typeof Clock }
> = {
  pending: {
    label: "待筛选",
    badge:
      "bg-(--app-warning-soft) text-(--app-warning) border border-(--app-border)",
    Icon: Clock,
  },
  passed: {
    label: "已通过",
    badge:
      "bg-(--app-primary-soft) text-(--app-primary) border border-(--app-border)",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "已拒绝",
    badge:
      "bg-(--app-surface-raised) text-(--app-text-secondary) border border-(--app-border)",
    Icon: XCircle,
  },
};

function getInitials(name: string) {
  const t = name.trim();
  if (!t) return "?";
  return t.slice(0, 1).toUpperCase();
}

function scoreDisplayClass(score: number) {
  if (score >= 80) return "text-(--app-primary)";
  if (score >= 60) return "text-(--app-ai-text)";
  return "text-(--app-text-muted)";
}

export interface CandidateCardProps {
  resume: Resume;
  selected: boolean;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  formatDateShort: (iso: string) => string;
  screeningScores?: Map<number, number>;
}

/**
 * 单张候选人卡片（仅内容区）。须放在 &lt;li&gt; 内；列表请用 {@link CandidateCardList}。
 */
export function CandidateCard({
  resume,
  selected,
  onSelect,
  onDelete,
  formatDateShort,
  screeningScores,
}: CandidateCardProps) {
  const meta = STATUS_ROW[resume.status];
  const Icon = meta.Icon;
  const scoreVal =
    resume.score ?? screeningScores?.get(resume.id) ?? null;

  return (
    <article
      className={`rounded-2xl border border-(--app-ai-border) bg-(--app-surface) p-3.5 shadow-(--app-shadow-sm) transition-colors ${
        selected
          ? "bg-(--app-primary-soft)/40 ring-2 ring-(--app-primary)/30"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          aria-current={selected ? "true" : undefined}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring)"
          onClick={() => onSelect(resume.id)}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
              selected
                ? "bg-(--app-primary) text-white"
                : "bg-(--app-surface-raised) text-(--app-text-secondary) ring-1 ring-(--app-border)"
            }`}
            aria-hidden
          >
            {getInitials(resume.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-(--app-text-primary)">
              {resume.name}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {scoreVal != null ? (
                <span
                  className={`text-sm font-black tabular-nums ${scoreDisplayClass(scoreVal)}`}
                >
                  {scoreVal}
                  <span className="ml-0.5 text-[9px] font-bold text-(--app-text-muted)">
                    分
                  </span>
                </span>
              ) : (
                <span className="text-xs font-semibold text-(--app-text-muted)/50">
                  —
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}
              >
                <Icon className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                {meta.label}
              </span>
            </div>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="rounded-lg p-2 text-(--app-text-secondary) transition-colors hover:bg-(--app-primary-soft) hover:text-(--app-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring)"
            aria-label={`查看 ${resume.name}`}
            onClick={() => onSelect(resume.id)}
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-(--app-text-secondary) transition-colors hover:bg-(--app-danger-soft) hover:text-(--app-danger) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-danger)/40"
            aria-label={`删除 ${resume.name}`}
            onClick={() => onDelete(resume.id)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1.5 border-t border-(--app-ai-border)/60 pt-3 text-[11px] text-(--app-text-secondary)">
        <span className="flex min-w-0 items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 shrink-0 text-(--app-text-muted)" aria-hidden />
          <span className="truncate">{resume.email || "—"}</span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 shrink-0 text-(--app-text-muted)" aria-hidden />
          <span className="truncate">{resume.phone || "—"}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-(--app-text-muted)" aria-hidden />
          {formatDateShort(resume.createdAt)}
        </span>
      </div>
    </article>
  );
}

export interface CandidateCardListProps {
  resumes: Resume[];
  selectedResumeId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  formatDateShort: (iso: string) => string;
  screeningScores?: Map<number, number>;
}

/**
 * 移动端/窄屏候选人列表：&lt;ul&gt; 下仅 &lt;li&gt;，避免 axe 结构类报错；不使用嵌套在 ul 内的 role=&quot;option&quot;。
 */
export function CandidateCardList({
  resumes,
  selectedResumeId,
  onSelect,
  onDelete,
  formatDateShort,
  screeningScores,
}: CandidateCardListProps) {
  return (
    <ul className="m-0 list-none space-y-3 p-0" aria-label="候选人列表">
      {resumes.map((resume) => {
        const selected = selectedResumeId === resume.id;
        return (
          <li key={resume.id}>
            <CandidateCard
              resume={resume}
              selected={selected}
              onSelect={onSelect}
              onDelete={onDelete}
              formatDateShort={formatDateShort}
              screeningScores={screeningScores}
            />
          </li>
        );
      })}
    </ul>
  );
}
