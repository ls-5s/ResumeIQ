import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import toast from "../../utils/toast";
import {
  Loader2,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
  Settings2,
  ExternalLink,
  Filter,
} from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../Drawer";
import { AiScreeningSettingsModal } from "./AiScreeningSettingsModal";
import { PreFilterModal } from "./PreFilterModal";
import { DeleteResumeConfirmModal } from "./DeleteResumeConfirmModal";
import { AiReasoningContent } from "./AiReasoningContent";
import { ScreeningCandidateTable } from "./components/ScreeningCandidateTable";
import { SCREENING_STATUS_META as STATUS_META } from "./screeningConstants";
import {
  type PreFilterConfig,
  getDefaultPreFilter,
  isEmptyPreFilter,
} from "./preFilterUtils";
import { getTemplate, loadTemplates } from "../../api/screeningTemplate";
import type { ScreeningTemplate } from "../../types/screening-template";
import {
  getResumes,
  getFilteredResumes,
  updateResumeStatus,
  deleteResume,
} from "../../api/resume";
import {
  batchScreenResumesWithAi,
  screenResumeWithAi,
  getAiConfigs,
} from "../../api/ai";
import { logActivity } from "../../api/dashboard";
import { formatDateShort } from "../../utils/format";
import type { Resume } from "../../types/resume";
import type { AiConfig, AiDimensionScores } from "../../types/ai";
import {
  type MatchRadarRow,
  parseStoredDimensionScores,
  radarRowsFromDimensions,
  buildFallbackRadarRows,
} from "./matchDimensions";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type StatusFilter = "all" | "pending" | "passed" | "rejected";

function findTemplateIdByConfig(
  templates: ScreeningTemplate[],
  cfg: PreFilterConfig,
): number | null {
  const serialized = JSON.stringify(cfg);
  const hit = templates.find((t) => JSON.stringify(t.config) === serialized);
  return hit?.id ?? null;
}

const listStatusStyles = {
  pending: STATUS_META.pending.badge,
  passed: STATUS_META.passed.badge,
  rejected: STATUS_META.rejected.badge,
};
const listStatusLabels = {
  pending: STATUS_META.pending.label,
  passed: STATUS_META.passed.label,
  rejected: STATUS_META.rejected.label,
};

const SCORE_RING_R = 36;
const SCORE_RING_C = 2 * Math.PI * SCORE_RING_R;

function MatchRadarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: MatchRadarRow }[];
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-(--app-ai-border) bg-(--app-surface)/95 px-2.5 py-2 text-xs shadow-(--app-shadow)">
      <p className="font-semibold text-(--app-ai-text)">{row.dimension}</p>
      <p className="mt-0.5 tabular-nums text-(--app-primary)">{row.value}%</p>
    </div>
  );
}

function MatchDimensionRadar({
  score,
  dimensions,
}: {
  score: number;
  dimensions?: AiDimensionScores | null;
}) {
  const data = useMemo(() => {
    if (dimensions) return radarRowsFromDimensions(dimensions);
    return buildFallbackRadarRows(score);
  }, [score, dimensions]);
  const fromModel = Boolean(dimensions);
  return (
    <div
      className="h-[200px] w-full min-w-0 flex-1 sm:h-[220px]"
      role="img"
      aria-label={
        fromModel
          ? "简历关键板块覆盖度雷达图（模型分项）"
          : "简历关键板块雷达图（无分项时的参考分布）"
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="52%" outerRadius="72%" data={data}>
          <PolarGrid stroke="#bfdbfe" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "#1e3a8a", fontSize: 9 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="得分"
            dataKey="value"
            stroke="#2563eb"
            fill="#3b82f6"
            fillOpacity={0.32}
            strokeWidth={2}
            isAnimationActive
          />
          <Tooltip content={<MatchRadarTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MatchScoreRing({ score }: { score: number }) {
  const s = Math.min(100, Math.max(0, Math.round(score)));
  const dashOffset = SCORE_RING_C - (s / 100) * SCORE_RING_C;
  const [stroke, text, gradeBg, grade] =
    s >= 80
      ? ([
          "#2563eb",
          "text-(--app-primary-hover)",
          "bg-(--app-primary) text-white",
          "优秀",
        ] as const)
      : s >= 60
        ? ([
            "#60a5fa",
            "text-(--app-primary)",
            "bg-(--app-ai-soft) text-(--app-primary-hover)",
            "良好",
          ] as const)
        : ([
            "#bfdbfe",
            "text-(--app-primary)/40",
            "bg-(--app-ai-soft) text-(--app-primary)",
            "待定",
          ] as const);
  return (
    <div className="flex flex-col items-center gap-2" aria-hidden>
      <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={SCORE_RING_R}
            fill="none"
            stroke="#dbeafe"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={SCORE_RING_R}
            fill="none"
            stroke={stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={SCORE_RING_C}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-[2rem] font-black tabular-nums leading-none ${text}`}
          >
            {s}
          </span>
          <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-(--app-text-muted)">
            分
          </span>
        </div>
      </div>
      <span
        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${gradeBg}`}
      >
        {grade}
      </span>
    </div>
  );
}

const LIST_PAGE_SIZE = 8;

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

interface ScreeningResult {
  resumeId: number;
  recommendation: "pass" | "reject" | "pending";
  score: number;
  reasoning: string;
  resume?: Resume;
  dimensions?: AiDimensionScores;
}

const mapStatusToRecommendation = (
  status: Resume["status"],
): "pass" | "reject" | "pending" => {
  if (status === "passed") return "pass";
  if (status === "rejected") return "reject";
  return "pending";
};

const recToStatus = (r: "pass" | "reject" | "pending"): Resume["status"] =>
  r === "pass" ? "passed" : r === "reject" ? "rejected" : "pending";

export function AiScreening() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [screeningResults, setScreeningResults] = useState<
    Map<number, ScreeningResult>
  >(new Map());
  const [screeningResumeId, setScreeningResumeId] = useState<number | null>(
    null,
  );
  const [jobRequirements, setJobRequirements] = useState("");
  const [screeningAll, setScreeningAll] = useState(false);
  const [jobConfigModalOpen, setJobConfigModalOpen] = useState(false);
  const [aiConfigs, setAiConfigs] = useState<AiConfig[]>([]);
  const [selectedAiConfigId, setSelectedAiConfigId] = useState<number | null>(
    null,
  );
  const [loadingAiConfigs, setLoadingAiConfigs] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [preFilterConfig, setPreFilterConfig] =
    useState<PreFilterConfig>(getDefaultPreFilter);
  const [preFilterModalOpen, setPreFilterModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [screeningTemplates, setScreeningTemplates] = useState<
    ScreeningTemplate[]
  >([]);
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [listPage, setListPage] = useState(1);

  const filteredResumes = useMemo(() => {
    let list = resumes;
    if (!isEmptyPreFilter(preFilterConfig)) {
      const keywords = preFilterConfig.keywords
        .split(/[,，\s\n]+/)
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
      const mode = preFilterConfig.keywordMode;
      list = list.filter((r) => {
        if (keywords.length > 0) {
          const searchable = [
            r.name,
            r.email ?? "",
            r.phone ?? "",
            r.parsedContent ?? "",
            r.summary ?? "",
          ]
            .join(" ")
            .toLowerCase();
          const matches = keywords.filter((kw) => searchable.includes(kw));
          const matchKeywords =
            mode === "and"
              ? matches.length === keywords.length
              : matches.length > 0;
          if (!matchKeywords) return false;
        }
        if (
          preFilterConfig.minScore != null &&
          r.score != null &&
          r.score < preFilterConfig.minScore
        )
          return false;
        if (
          preFilterConfig.dateFrom.trim() &&
          r.createdAt.slice(0, 10) < preFilterConfig.dateFrom
        )
          return false;
        if (
          preFilterConfig.dateTo.trim() &&
          r.createdAt.slice(0, 10) > preFilterConfig.dateTo
        )
          return false;
        return true;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.email && r.email.toLowerCase().includes(q)),
      );
    }
    if (statusFilter !== "all")
      list = list.filter((r) => r.status === statusFilter);
    return list;
  }, [resumes, searchQuery, statusFilter, preFilterConfig]);

  const sortedResumes = useMemo(() => {
    return [...filteredResumes].sort((a, b) => {
      const scoreA = a.score ?? screeningResults.get(a.id)?.score ?? -1;
      const scoreB = b.score ?? screeningResults.get(b.id)?.score ?? -1;
      return scoreB - scoreA;
    });
  }, [filteredResumes, screeningResults]);

  const screeningScoresMap = useMemo(() => {
    const m = new Map<number, number>();
    screeningResults.forEach((r, id) => {
      m.set(id, r.score);
    });
    return m;
  }, [screeningResults]);

  const stats = useMemo(
    () => ({
      all: resumes.length,
      pending: resumes.filter((r) => r.status === "pending").length,
      passed: resumes.filter((r) => r.status === "passed").length,
      rejected: resumes.filter((r) => r.status === "rejected").length,
    }),
    [resumes],
  );

  const listTotalPages = Math.max(
    1,
    Math.ceil(sortedResumes.length / LIST_PAGE_SIZE),
  );
  const paginatedResumes = useMemo(
    () =>
      sortedResumes.slice(
        (listPage - 1) * LIST_PAGE_SIZE,
        listPage * LIST_PAGE_SIZE,
      ),
    [sortedResumes, listPage],
  );

  const selectedResume = useMemo(
    () => resumes.find((r) => r.id === selectedResumeId),
    [resumes, selectedResumeId],
  );

  const selectedResult = useMemo((): ScreeningResult | null => {
    if (!selectedResumeId || !selectedResume) return null;
    const dimsFromDb = parseStoredDimensionScores(
      selectedResume.dimensionScores,
    );
    const fromMap = screeningResults.get(selectedResumeId);
    if (fromMap) {
      return {
        ...fromMap,
        dimensions: fromMap.dimensions ?? dimsFromDb,
      };
    }
    if (selectedResume.summary) {
      return {
        resumeId: selectedResume.id,
        recommendation: mapStatusToRecommendation(selectedResume.status),
        score: selectedResume.score ?? 50,
        reasoning: selectedResume.summary,
        resume: selectedResume,
        dimensions: dimsFromDb,
      };
    }
    return null;
  }, [selectedResumeId, selectedResume, screeningResults]);

  useEffect(() => {
    setListPage(1);
  }, [searchQuery, statusFilter, preFilterConfig]);
  useEffect(() => {
    setReasoningOpen(Boolean(selectedResult?.reasoning?.trim()));
  }, [selectedResumeId, selectedResult?.reasoning]);

  useEffect(() => {
    if (
      selectedResumeId != null &&
      !resumes.some((r) => r.id === selectedResumeId)
    ) {
      setSelectedResumeId(null);
    }
  }, [selectedResumeId, resumes]);

  useEffect(() => {
    const init = async () => {
      let list: ScreeningTemplate[] = [];
      try {
        list = await loadTemplates();
      } catch {
        list = [];
      }
      setScreeningTemplates(list);

      const activeId = localStorage.getItem("active-screening-template");
      localStorage.removeItem("active-screening-template");

      const applyConfig = async (
        cfg: PreFilterConfig,
        templateId: number | null,
      ) => {
        setPreFilterConfig(cfg);
        setActiveTemplateId(templateId);
        if (!isEmptyPreFilter(cfg)) await loadResumes(cfg);
        else await loadResumes();
      };

      if (activeId) {
        try {
          const tpl = await getTemplate(Number(activeId));
          await applyConfig(tpl.config, tpl.id);
          toast.success(`已应用模版「${tpl.name}」的筛选条件`);
        } catch {
          const def = list.find((t) => t.isDefault);
          if (def) await applyConfig(def.config, def.id);
          else await applyConfig(getDefaultPreFilter(), null);
        }
      } else {
        const def = list.find((t) => t.isDefault);
        if (def) await applyConfig(def.config, def.id);
        else await applyConfig(getDefaultPreFilter(), null);
      }
      await loadAiConfigs();
    };
    void init();
  }, []);

  const loadAiConfigs = async () => {
    try {
      setLoadingAiConfigs(true);
      const configs = await getAiConfigs();
      setAiConfigs(configs);
      if (configs.length > 0) {
        const defaultConfig = configs.find((c) => c.isDefault) || configs[0];
        setSelectedAiConfigId(defaultConfig.id);
        if (defaultConfig.prompt) setJobRequirements(defaultConfig.prompt);
      }
    } catch (error) {
      console.error("加载AI配置失败:", error);
    } finally {
      setLoadingAiConfigs(false);
    }
  };

  const loadResumes = async (
    filters?: Parameters<typeof getFilteredResumes>[0],
  ) => {
    try {
      setLoading(true);
      const data =
        filters && !isEmptyPreFilter(filters as PreFilterConfig)
          ? await getFilteredResumes(filters)
          : await getResumes();
      setResumes(data);
    } catch (error) {
      console.error("加载简历失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteResume = (resumeId: number) => {
    const r = resumes.find((x) => x.id === resumeId);
    setDeleteConfirm({
      id: resumeId,
      name: (r?.name ?? "").trim() || "该候选人",
    });
  };

  const executeDeleteResume = async () => {
    if (deleteConfirm == null) return;
    const resumeId = deleteConfirm.id;
    setDeleteConfirm(null);
    try {
      await deleteResume(resumeId);
      setResumes((prev) => prev.filter((r) => r.id !== resumeId));
      setScreeningResults((prev) => {
        const next = new Map(prev);
        next.delete(resumeId);
        return next;
      });
      if (selectedResumeId === resumeId) setSelectedResumeId(null);
      toast.success("已删除简历");
    } catch (error) {
      console.error("删除简历失败:", error);
      toast.error("删除失败，请重试");
    }
  };

  const openResumeInNewWindow = (resume: Resume) => {
    if (!resume.resumeFile) return;
    const relativePath = resume.resumeFile
      .replace(/^.*[\\/]uploads[\\/]/, "uploads/")
      .replace(/\\/g, "/");
    window.open(
      `${API_BASE_URL}/${relativePath}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleUpdateStatus = async (
    resumeId: number,
    status: "pending" | "passed" | "rejected",
  ) => {
    const resume = resumes.find((r) => r.id === resumeId);
    const statusToast: Record<typeof status, string> = {
      pending: "已设为待定",
      passed: "已通过初筛",
      rejected: "已标记为未通过",
    };
    try {
      await updateResumeStatus(resumeId, status);
      setResumes((prev) =>
        prev.map((r) => (r.id === resumeId ? { ...r, status } : r)),
      );
      try {
        if (status === "passed") {
          await logActivity({
            type: "pass",
            resumeId,
            resumeName: resume?.name ?? undefined,
            description: "通过初筛",
          });
        } else if (status === "rejected") {
          await logActivity({
            type: "reject",
            resumeId,
            resumeName: resume?.name ?? undefined,
            description: "未通过筛选",
          });
        }
      } catch (logErr) {
        console.error("记录活动失败:", logErr);
      }
      toast.success(statusToast[status]);
    } catch (error) {
      console.error("更新状态失败:", error);
      toast.error("状态更新失败，请重试");
    }
  };

  const handleScreenResume = async (resumeId: number) => {
    if (!jobRequirements.trim()) {
      toast.error("请输入岗位要求");
      return;
    }
    if (!selectedAiConfigId) {
      toast.error("请选择 AI 配置");
      return;
    }
    const resume = resumes.find((r) => r.id === resumeId);
    try {
      setScreeningResumeId(resumeId);
      const result = await screenResumeWithAi({
        resumeId,
        jobRequirements,
        aiConfigId: selectedAiConfigId,
      });
      setResumes((prev) =>
        prev.map((r) =>
          r.id === resumeId
            ? {
                ...r,
                summary: result.reasoning,
                status: recToStatus(result.recommendation),
                score: result.score,
                dimensionScores: result.dimensions ?? r.dimensionScores ?? null,
              }
            : r,
        ),
      );
      setScreeningResults((prev) => {
        const newMap = new Map(prev);
        newMap.set(resumeId, { ...result, resumeId, resume });
        return newMap;
      });
      await logActivity({
        type: "screening",
        resumeId,
        resumeName: resume?.name,
        description: result.reasoning,
      });
    } catch (error) {
      console.error("AI筛选失败:", error);
      toast.error("AI 筛选失败，请重试");
    } finally {
      setScreeningResumeId(null);
    }
  };

  const handleBatchScreen = async () => {
    if (!jobRequirements.trim()) {
      toast.error("请输入岗位要求");
      return;
    }
    if (!selectedAiConfigId) {
      toast.error("请选择 AI 配置");
      return;
    }
    const toScreen = sortedResumes;
    if (toScreen.length === 0) {
      toast.error("当前筛选结果为空，无可筛简历");
      return;
    }
    try {
      setScreeningAll(true);
      const results = await batchScreenResumesWithAi({
        resumeIds: toScreen.map((r) => r.id),
        jobRequirements,
        aiConfigId: selectedAiConfigId,
      });
      setResumes((prev) =>
        prev.map((r) => {
          const item = results.find(
            (res) => res.resumeId === r.id && res.success && res.result,
          );
          if (!item || !item.result) return r;
          return {
            ...r,
            summary: item.result.reasoning,
            status: recToStatus(item.result.recommendation),
            score: item.result.score,
            dimensionScores:
              item.result.dimensions ?? r.dimensionScores ?? null,
          };
        }),
      );
      setScreeningResults((prev) => {
        const newMap = new Map(prev);
        results.forEach((item) => {
          if (item.success && item.result) {
            const resume = toScreen.find((r) => r.id === item.resumeId);
            newMap.set(item.resumeId, {
              ...item.result,
              resumeId: item.resumeId,
              resume,
            });
          }
        });
        return newMap;
      });
      await Promise.all(
        results
          .filter((item) => item.success && item.result)
          .map((item) => {
            const r = toScreen.find((res) => res.id === item.resumeId);
            return logActivity({
              type: "screening",
              resumeId: item.resumeId,
              resumeName: r?.name,
              description: item.result!.reasoning,
            });
          }),
      );
      await loadResumes();
    } catch (error) {
      console.error("批量筛选失败:", error);
      toast.error("批量筛选失败，请重试");
    } finally {
      setScreeningAll(false);
    }
  };

  return (
    <div className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col">
      <PreFilterModal
        open={preFilterModalOpen}
        onClose={() => setPreFilterModalOpen(false)}
        config={preFilterConfig}
        onConfigChange={setPreFilterConfig}
        onApply={(config) => {
          setActiveTemplateId(
            findTemplateIdByConfig(screeningTemplates, config),
          );
          void loadResumes(isEmptyPreFilter(config) ? undefined : config);
          setPreFilterModalOpen(false);
        }}
        templateName={
          activeTemplateId != null
            ? screeningTemplates.find((t) => t.id === activeTemplateId)?.name
            : null
        }
        onClear={() => setActiveTemplateId(null)}
      />
      <DeleteResumeConfirmModal
        open={deleteConfirm != null}
        candidateName={deleteConfirm?.name ?? ""}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        onConfirm={() => void executeDeleteResume()}
      />
      <AiScreeningSettingsModal
        open={jobConfigModalOpen}
        onClose={() => setJobConfigModalOpen(false)}
        jobRequirements={jobRequirements}
        onJobRequirementsChange={setJobRequirements}
        aiConfigs={aiConfigs}
        loadingAiConfigs={loadingAiConfigs}
        selectedAiConfigId={selectedAiConfigId}
        onSelectConfigId={(configId) => {
          setSelectedAiConfigId(configId);
          const cfg = aiConfigs.find((c) => c.id === configId);
          if (cfg?.prompt) setJobRequirements(cfg.prompt);
        }}
        onBatchScreen={handleBatchScreen}
        screeningAll={screeningAll}
        batchDisabled={
          screeningAll ||
          sortedResumes.length === 0 ||
          !selectedAiConfigId ||
          !jobRequirements.trim()
        }
      />

      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-(--app-ai-bg)"
        aria-hidden
      />

      <div className="mx-auto flex min-h-0 w-full max-w-[1360px] flex-1 flex-col px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:mb-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-(--app-ai-soft) px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-(--app-primary) ring-1 ring-inset ring-(--app-ai-border)">
                <Sparkles className="h-3 w-3" />
                AI Screening
              </span>
            </div>
            <h1 className="mt-2.5 text-[1.6rem] font-black tracking-tight text-(--app-ai-text) sm:text-[1.85rem]">
              智能筛选工作台
            </h1>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-(--app-ai-text)/60">
              点击列表中的候选人，在侧滑抽屉中查看 AI
              评分与推荐理由，一键决策通过或拒绝。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setJobConfigModalOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-(--app-surface)/70 bg-(--app-surface)/35 px-4 py-2.5 text-sm font-semibold text-(--app-primary-hover) shadow-(--app-shadow-primary) backdrop-blur-xl transition-all hover:bg-(--app-surface)/50 hover:border-(--app-ai-border)/70 hover:shadow-(--app-shadow-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-primary) focus-visible:ring-offset-2 lg:self-auto"
          >
            <Settings2 className="h-4 w-4" aria-hidden />
            岗位与 AI 配置
          </button>
        </header>
        <section
          className="flex min-h-[min(820px,calc(100dvh-5.5rem))] w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-(--app-ai-border) bg-(--app-surface)/80 shadow-(--app-shadow-sm) backdrop-blur-md"
          aria-label="AI 筛选工作台"
        >
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
            <aside className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-(--app-ai-border)/80 bg-linear-to-b from-(--app-ai-soft)/50 to-(--app-surface)/40">
              <div className="shrink-0 border-b border-(--app-ai-border)/90 px-4 pb-3 pt-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-(--app-ai-text)">
                    候选人列表
                  </h2>
                  <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
                    <label htmlFor="aiscreening-template" className="sr-only">
                      筛选模版
                    </label>
                    <select
                      id="aiscreening-template"
                      title="选择筛选模版"
                      value={
                        activeTemplateId != null
                          ? String(activeTemplateId)
                          : isEmptyPreFilter(preFilterConfig)
                            ? ""
                            : "__custom__"
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "__custom__") {
                          setActiveTemplateId(null);
                          return;
                        }
                        if (v === "") {
                          setActiveTemplateId(null);
                          setPreFilterConfig(getDefaultPreFilter());
                          void loadResumes();
                          return;
                        }
                        const id = Number(v);
                        const tpl = screeningTemplates.find((t) => t.id === id);
                        if (!tpl) return;
                        setActiveTemplateId(id);
                        setPreFilterConfig({ ...tpl.config });
                        void loadResumes(
                          isEmptyPreFilter(tpl.config) ? undefined : tpl.config,
                        );
                        toast.success(`已选用「${tpl.name}」`);
                      }}
                      className="h-8 max-w-full min-w-0 flex-1 rounded-lg border border-(--app-ai-border) bg-(--app-surface) px-2 text-xs font-medium text-(--app-ai-text) shadow-sm focus:border-(--app-primary) focus:outline-none focus:ring-2 focus:ring-(--app-ai-border) sm:max-w-44 sm:flex-none"
                    >
                      <option value="">无模版（清空条件）</option>
                      <option value="__custom__">
                        自定义（保留当前条件，不关联模版）
                      </option>
                      {screeningTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.isDefault ? " · 默认" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setPreFilterModalOpen(true)}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-primary) focus-visible:ring-offset-1 ${
                        isEmptyPreFilter(preFilterConfig)
                          ? "text-(--app-ai-text)/45 hover:bg-(--app-ai-soft)/80 hover:text-(--app-primary-hover)"
                          : "bg-(--app-ai-soft) text-(--app-primary-hover) ring-1 ring-(--app-ai-border)"
                      }`}
                    >
                      <Filter className="h-3.5 w-3.5" aria-hidden />
                      筛选条件
                      {!isEmptyPreFilter(preFilterConfig) && (
                        <span
                          className="ml-0.5 h-1.5 w-1.5 rounded-full bg-(--app-primary)"
                          aria-hidden
                        />
                      )}
                    </button>
                    <span className="shrink-0 tabular-nums text-[11px] font-medium text-(--app-ai-text)/45">
                      {filteredResumes.length} 条
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--app-primary)/70"
                    aria-hidden
                  />
                  <input
                    type="search"
                    placeholder="搜索姓名或邮箱…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-full rounded-lg border border-(--app-ai-border) bg-(--app-surface) pl-9 pr-3 text-sm text-(--app-ai-text) placeholder:text-(--app-ai-text)/35 shadow-sm transition focus:border-(--app-primary) focus:outline-none focus:ring-2 focus:ring-(--app-ai-border)"
                    aria-label="搜索候选人"
                  />
                </div>
              </div>

              <div
                className="shrink-0 border-b border-(--app-ai-border)/90 bg-(--app-surface)/30 px-3 py-2"
                role="group"
                aria-label="按状态筛选"
              >
                <div className="flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
                  {(
                    [
                      { key: "all" as const, label: "全部", color: "" },
                      {
                        key: "pending" as const,
                        label: "待筛选",
                        color: STATUS_META.pending.dot,
                      },
                      {
                        key: "passed" as const,
                        label: "已通过",
                        color: STATUS_META.passed.dot,
                      },
                      {
                        key: "rejected" as const,
                        label: "已拒绝",
                        color: STATUS_META.rejected.dot,
                      },
                    ] as const
                  ).map(({ key, label, color }) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={statusFilter === key ? true : undefined}
                      onClick={() => setStatusFilter(key)}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        statusFilter === key
                          ? "bg-(--app-primary) text-white shadow-sm"
                          : "text-(--app-ai-text)/50 hover:bg-(--app-ai-soft)/80 hover:text-(--app-primary-hover)"
                      }`}
                    >
                      {color && (
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${color}`}
                        />
                      )}
                      {label}
                      <span className="tabular-nums opacity-70">
                        {key === "all" ? stats.all : stats[key]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden px-0 py-0">
                {loading ? (
                  <div
                    className="h-full min-h-[200px] overflow-auto px-2 py-2"
                    aria-busy="true"
                    aria-label="加载中"
                  >
                    <table className="w-full min-w-[640px] border-collapse">
                      <thead className="border-b border-(--app-ai-border)/90 bg-(--app-surface-raised)/95 text-(--app-text-secondary)">
                        <tr className="text-[11px] font-semibold uppercase tracking-wide">
                          <th className="px-3 py-2.5 pl-4 text-left">候选人</th>
                          <th className="px-3 py-2.5 text-left normal-case">
                            <span className="block leading-tight">匹配分</span>
                            <span className="mt-0.5 block text-[10px] font-normal tracking-normal text-(--app-text-muted)">
                              状态
                            </span>
                          </th>
                          <th className="px-3 py-2.5 text-left">联系方式</th>
                          <th className="px-3 py-2.5 text-left">导入时间</th>
                          <th className="w-24 px-3 py-2.5 pr-4 text-right">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i} className="border-b border-(--app-ai-soft)/80">
                            <td colSpan={5} className="px-3 py-3">
                              <div className="h-12 animate-pulse rounded-lg bg-linear-to-r from-(--app-ai-soft)/40 via-(--app-ai-soft)/60 to-(--app-ai-soft)/30" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : filteredResumes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-(--app-ai-soft)/60 ring-1 ring-(--app-ai-border)">
                      <FileText
                        className="h-7 w-7 text-(--app-primary)"
                        strokeWidth={1.5}
                      />
                    </div>
                    <p className="text-sm font-bold text-(--app-ai-text)">
                      {resumes.length === 0
                        ? "还没有简历"
                        : "没有符合条件的候选人"}
                    </p>
                    <p className="mt-1 max-w-56 text-xs leading-relaxed text-(--app-ai-text)/50">
                      {resumes.length === 0
                        ? "上传后即可在此用 AI 初筛"
                        : "调整搜索、状态或筛选条件试试"}
                    </p>
                    {resumes.length === 0 && (
                      <Link
                        to="/app/resumes"
                        className="mt-5 inline-flex items-center rounded-xl bg-(--app-primary) px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-(--app-primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-primary) focus-visible:ring-offset-2"
                      >
                        前往简历管理
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full min-h-0 flex-col px-2 py-2">
                    <ScreeningCandidateTable
                      resumes={paginatedResumes}
                      selectedResumeId={selectedResumeId}
                      onSelect={setSelectedResumeId}
                      onDelete={requestDeleteResume}
                      formatDateShort={formatDateShort}
                      screeningScores={screeningScoresMap}
                    />
                  </div>
                )}
              </div>

              {!loading && filteredResumes.length > 0 && (
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-(--app-ai-border)/90 bg-(--app-surface)/90 px-3 py-2.5 backdrop-blur-sm">
                  <span className="text-[11px] tabular-nums text-(--app-ai-text)/45">
                    {listTotalPages > 1
                      ? `第 ${listPage} / ${listTotalPages} 页 · ${filteredResumes.length} 条`
                      : `${filteredResumes.length} 条`}
                  </span>
                  {listTotalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setListPage((p) => Math.max(1, p - 1))}
                        disabled={listPage <= 1}
                        className="rounded-lg border border-(--app-ai-border) bg-(--app-surface) p-1.5 text-(--app-primary) transition-colors hover:bg-(--app-ai-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-primary) disabled:pointer-events-none disabled:opacity-30"
                        aria-label="上一页"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setListPage((p) => Math.min(listTotalPages, p + 1))
                        }
                        disabled={listPage >= listTotalPages}
                        className="rounded-lg border border-(--app-ai-border) bg-(--app-surface) p-1.5 text-(--app-primary) transition-colors hover:bg-(--app-ai-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-primary) disabled:pointer-events-none disabled:opacity-30"
                        aria-label="下一页"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </aside>

            <Drawer
              open={Boolean(selectedResume)}
              onOpenChange={(open) => {
                if (!open) setSelectedResumeId(null);
              }}
            >
              <DrawerContent className="flex h-dvh max-h-dvh w-full max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
                <DrawerHeader className="sr-only">
                  <DrawerTitle>
                    {selectedResume
                      ? `${selectedResume.name} · 候选人详情`
                      : "候选人详情"}
                  </DrawerTitle>
                </DrawerHeader>
                {selectedResume ? (
                  <>
                    <div className="sticky top-0 z-10 shrink-0 border-b border-(--app-ai-border) bg-(--app-surface)/80 px-4 py-4 pr-14 shadow-(--app-shadow-sm) backdrop-blur-md sm:px-6 sm:pr-14">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-semibold tracking-tight text-(--app-text-primary) sm:text-xl">
                              {selectedResume.name}
                            </h2>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${listStatusStyles[selectedResume.status]}`}
                            >
                              {listStatusLabels[selectedResume.status]}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-(--app-text-secondary) sm:text-sm">
                            导入时间 {formatDateShort(selectedResume.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedResume.resumeFile && (
                            <button
                              type="button"
                              onClick={() =>
                                openResumeInNewWindow(selectedResume)
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl border border-(--app-surface)/70 bg-(--app-surface)/35 px-3 py-2 text-sm font-medium text-(--app-primary-hover) shadow-(--app-shadow-primary) backdrop-blur-xl transition-all hover:bg-(--app-surface)/50 hover:border-(--app-ai-border)/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-primary)"
                            >
                              <ExternalLink className="h-4 w-4 text-(--app-primary)" />
                              打开简历
                            </button>
                          )}
                          {selectedResumeId != null && (
                            <button
                              type="button"
                              onClick={() =>
                                handleScreenResume(selectedResumeId)
                              }
                              disabled={
                                screeningResumeId === selectedResumeId ||
                                !jobRequirements.trim()
                              }
                              title={
                                !jobRequirements.trim()
                                  ? "请先在「岗位与 AI 配置」中填写岗位要求"
                                  : undefined
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl bg-(--app-primary) px-3.5 py-2 text-sm font-semibold text-white shadow-(--app-shadow) transition-all hover:bg-(--app-primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-primary) focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45"
                            >
                              {screeningResumeId === selectedResumeId ? (
                                <Loader2
                                  className="h-4 w-4 animate-spin"
                                  aria-hidden
                                />
                              ) : (
                                <Sparkles className="h-4 w-4" aria-hidden />
                              )}
                              AI 筛选
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
                      <div className="mx-auto max-w-3xl space-y-5">
                        <div className="min-w-0 rounded-2xl border border-(--app-ai-border) bg-(--app-ai-soft)/40 p-5 shadow-sm backdrop-blur-sm">
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-(--app-ai-text)">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--app-surface) ring-1 ring-(--app-ai-border)">
                              <BarChart3 className="h-4 w-4 text-(--app-primary)" />
                            </span>
                            匹配度
                          </h3>
                          {selectedResult ? (
                            <div className="flex flex-col gap-4">
                              <div className="space-y-1 border-b border-(--app-ai-border)/80 pb-3 text-center sm:text-left">
                                <p className="text-xs font-medium uppercase tracking-wide text-(--app-primary)">
                                  {selectedResult.dimensions
                                    ? "简历关键点（模型分项）"
                                    : "简历关键点（参考分布）"}
                                </p>
                                <p className="text-[11px] leading-relaxed text-(--app-primary)/85">
                                  {selectedResult.dimensions
                                    ? "七项对应简历常见关键板块，由本次 AI 依据简历与岗位要求打分；与下方评估理由一致，悬停顶点查看分值"
                                    : "尚无模型分项：以下为按综合分生成的参考图形，重新运行「AI 筛选」可生成分项"}
                                </p>
                              </div>
                              <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6">
                                <div className="flex justify-center sm:justify-start">
                                  <MatchScoreRing
                                    score={selectedResult.score}
                                  />
                                </div>
                                <div className="min-h-[188px] min-w-0 w-full sm:min-h-[200px]">
                                  <MatchDimensionRadar
                                    score={selectedResult.score}
                                    dimensions={selectedResult.dimensions}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center py-6 text-center">
                              <p className="text-sm text-(--app-primary)">
                                尚未生成匹配分
                              </p>
                              <p className="mt-1 text-xs text-(--app-primary)/40">
                                点击右上角「AI 筛选」运行模型
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-(--app-ai-border) bg-(--app-surface)/80 shadow-sm backdrop-blur-sm">
                          <button
                            type="button"
                            onClick={() => setReasoningOpen((v) => !v)}
                            aria-expanded={reasoningOpen ? true : undefined}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-(--app-ai-soft)/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--app-primary)"
                          >
                            <span className="flex items-center gap-2 text-sm font-semibold text-(--app-ai-text)">
                              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-(--app-ai-soft)">
                                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-(--app-primary)" />
                              </span>
                              AI 评估理由
                            </span>
                            {reasoningOpen ? (
                              <ChevronUp className="h-4 w-4 shrink-0 text-(--app-primary)/40" />
                            ) : (
                              <ChevronDown className="h-4 w-4 shrink-0 text-(--app-primary)/40" />
                            )}
                          </button>
                          {reasoningOpen && (
                            <div className="border-t border-(--app-ai-border) bg-(--app-ai-soft)/30 px-4 py-4">
                              <AiReasoningContent
                                text={(selectedResult?.reasoning ?? "").trim()}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-(--app-ai-border) bg-(--app-surface)/80 px-4 py-3 shadow-(--app-shadow-sm) backdrop-blur-md sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateStatus(selectedResume.id, "pending")
                        }
                        className="rounded-xl border border-(--app-ai-border) bg-(--app-surface) px-4 py-2.5 text-sm font-semibold text-(--app-primary) shadow-sm transition-all hover:bg-(--app-ai-soft) hover:border-(--app-primary)/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-primary)"
                      >
                        待定
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateStatus(selectedResume.id, "rejected")
                        }
                        className="rounded-xl border border-(--app-ai-border) bg-(--app-surface) px-5 py-2.5 text-sm font-semibold text-(--app-primary) shadow-sm transition-all hover:bg-(--app-ai-soft) hover:text-(--app-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-primary)"
                      >
                        拒绝
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateStatus(selectedResume.id, "passed")
                        }
                        className="rounded-xl bg-(--app-primary) px-5 py-2.5 text-sm font-semibold text-white shadow-(--app-shadow) transition-all hover:bg-(--app-primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-primary) focus-visible:ring-offset-2"
                      >
                        通过
                      </button>
                    </div>
                  </>
                ) : null}
              </DrawerContent>
            </Drawer>
          </div>
        </section>
      </div>
    </div>
  );
}
