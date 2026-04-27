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

interface ScreeningCandidateTableProps {
  resumes: Resume[];
  selectedResumeId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  formatDateShort: (iso: string) => string;
  /** 本会话 AI 结果中的分，用于尚未合并进 resume.score 时展示 */
  screeningScores?: Map<number, number>;
}

export function ScreeningCandidateTable({
  resumes,
  selectedResumeId,
  onSelect,
  onDelete,
  formatDateShort,
  screeningScores,
}: ScreeningCandidateTableProps) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-auto text-(--app-text-primary)">
      <table
        role="grid"
        aria-label="候选人列表"
        className="w-full min-w-[640px] border-collapse text-left text-sm"
      >
        <thead className="sticky top-0 z-10 border-b border-(--app-ai-border)/90 bg-(--app-surface-raised)/95 text-(--app-text-secondary) backdrop-blur-sm">
          <tr className="text-[11px] font-semibold uppercase tracking-wide">
            <th className="whitespace-nowrap px-3 py-2.5 pl-4">候选人</th>
            <th className="whitespace-nowrap px-3 py-2.5 normal-case">
              <span className="block leading-tight">匹配分</span>
              <span className="mt-0.5 block text-[10px] font-normal tracking-normal text-(--app-text-muted)">
                状态
              </span>
            </th>
            <th className="min-w-[180px] px-3 py-2.5">联系方式</th>
            <th className="whitespace-nowrap px-3 py-2.5">导入时间</th>
            <th className="w-24 whitespace-nowrap px-3 py-2.5 pr-4 text-right">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--app-ai-border)/80 bg-(--app-surface)/50">
          {resumes.map((resume) => {
            const selected = selectedResumeId === resume.id;
            const meta = STATUS_ROW[resume.status];
            const Icon = meta.Icon;
            const scoreVal =
              resume.score ?? screeningScores?.get(resume.id) ?? null;
            return (
              <tr
                key={resume.id}
                id={`candidate-${resume.id}`}
                tabIndex={0}
                aria-selected={selected ? "true" : "false"}
                onClick={() => onSelect(resume.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(resume.id);
                  }
                }}
                className={`cursor-pointer transition-colors hover:bg-(--app-primary-soft)/60 ${
                  selected
                    ? "bg-(--app-primary-soft)/50 ring-1 ring-inset ring-(--app-ai-border)"
                    : ""
                }`}
              >
                <td className="align-middle px-3 py-3 pl-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        selected
                          ? "bg-(--app-primary) text-white"
                          : "bg-(--app-surface-raised) text-(--app-text-secondary) ring-1 ring-(--app-border)"
                      }`}
                      aria-hidden
                    >
                      {getInitials(resume.name)}
                    </div>
                    <span className="font-semibold text-(--app-text-primary)">
                      {resume.name}
                    </span>
                  </div>
                </td>
                <td className="align-middle px-3 py-3">
                  <div className="flex flex-col items-start gap-1">
                    {scoreVal != null ? (
                      <span
                        className={`text-sm font-black tabular-nums leading-none ${scoreDisplayClass(scoreVal)}`}
                        title="AI 匹配分"
                      >
                        {scoreVal}
                        <span className="ml-0.5 text-[9px] font-bold text-(--app-text-muted)">
                          分
                        </span>
                      </span>
                    ) : (
                      <span
                        className="text-xs font-semibold tabular-nums text-(--app-text-muted)/50"
                        title="尚未生成匹配分"
                      >
                        —
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}
                    >
                      <Icon
                        className="h-3 w-3 shrink-0 opacity-90"
                        aria-hidden
                      />
                      {meta.label}
                    </span>
                  </div>
                </td>
                <td className="align-middle px-3 py-3">
                  <div className="flex flex-col gap-1 text-[11px] text-(--app-text-secondary)">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Mail
                        className="h-3.5 w-3.5 shrink-0 text-(--app-text-muted)"
                        aria-hidden
                      />
                      <span className="truncate">{resume.email || "—"}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Phone
                        className="h-3.5 w-3.5 shrink-0 text-(--app-text-muted)"
                        aria-hidden
                      />
                      <span className="truncate">{resume.phone || "—"}</span>
                    </span>
                  </div>
                </td>
                <td className="align-middle whitespace-nowrap px-3 py-3 text-[11px] tabular-nums text-(--app-text-secondary)">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar
                      className="h-3.5 w-3.5 shrink-0 text-(--app-text-muted)"
                      aria-hidden
                    />
                    {formatDateShort(resume.createdAt)}
                  </span>
                </td>
                <td className="align-middle px-3 py-3 pr-4 text-right">
                  <div className="inline-flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-(--app-text-secondary) transition-colors hover:bg-(--app-primary-soft) hover:text-(--app-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring)"
                      aria-label={`查看 ${resume.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(resume.id);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-(--app-text-secondary) transition-colors hover:bg-(--app-danger-soft) hover:text-(--app-danger) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-danger)/40"
                      aria-label={`删除 ${resume.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(resume.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
