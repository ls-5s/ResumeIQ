import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "../../utils/toast";
import {
  Sparkles,
  Copy,
  ChevronDown,
  BookOpen,
  Upload,
  FileText,
  Search,
  X,
  Loader2,
  RotateCw,
  File,
  CheckCircle2,
  Share2,
  Printer,
} from "lucide-react";
import {
  getResumes,
  uploadResume,
} from "../../api/resume";
import {
  getAiConfigs,
  generateInterviewQuestions,
} from "../../api/ai";
import type { Resume } from "../../types/resume";
import type { AiConfig, InterviewQuestion } from "../../types/ai";
import { Modal } from "../../components/Modal";
import { formatFileSize } from "../../utils/format";
import { extractQuestionsFromRaw } from "../../utils/formatInterviewToMarkdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ============================================================================
// Exam Question List Component (renders Markdown)
// ============================================================================

interface ExamQuestionListProps {
  rawText: string;
}

function ExamQuestionList({ rawText }: ExamQuestionListProps) {
  // 提取面试题部分（## 面试题 之后的内容）
  const contentMatch = rawText.match(/#?\s*面试题([\s\S]*)$/i);
  const content = contentMatch ? contentMatch[1].trim() : rawText;

  if (!content.trim()) {
    return (
      <div className="text-center text-sm text-(--app-text-muted)">
        无法解析题目内容，请重新生成
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-(--app-text-primary) prose-p:text-(--app-text-secondary) prose-li:text-(--app-text-secondary) prose-strong:text-(--app-text-primary)">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

// ============================================================================
// Document-style interview questions (renders structured data with Markdown)
// ============================================================================

function QuestionDocument({
  questions,
  summary,
  candidateName,
}: {
  questions: InterviewQuestion[];
  summary: string;
  candidateName?: string;
}) {
  const documentRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    const text = [
      "# 面试题",
      candidateName ? `候选人：${candidateName}` : "",
      "",
      summary ? `## 面试考察重点\n${summary}` : "",
      ...questions.map((q, i) =>
        `## 题目${i + 1}\n\n**类别**：${q.category}\n\n**问题**：${q.question}${q.keyPoints.length > 0 ? `\n\n**考察要点**：\n${q.keyPoints.map(k => `- ${k}`).join("\n")}` : ""}${q.followUp ? `\n\n**追问方向**：${q.followUp}` : ""}`
      ).join("\n\n---\n\n"),
    ].filter(Boolean).join("\n\n");

    navigator.clipboard.writeText(text).then(() => {
      toast.success("已复制到剪贴板");
    });
  };

  const handleExportPDF = () => {
    if (!documentRef.current) return;

    // 使用 window.print 触发打印/导出PDF
    const printContent = documentRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("无法打开打印窗口，请检查浏览器设置");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>面试题 - ${candidateName || "候选人"}</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #333;
              padding: 40px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #6366f1;
            }
            .header h1 {
              font-size: 24px;
              color: #1f2937;
              margin-bottom: 8px;
            }
            .header p {
              color: #6b7280;
              font-size: 13px;
            }
            .summary {
              background: #f9fafb;
              padding: 16px;
              border-radius: 8px;
              margin-bottom: 24px;
            }
            .summary h3 {
              font-size: 14px;
              color: #6366f1;
              margin-bottom: 8px;
            }
            .summary p {
              color: #4b5563;
            }
            .question {
              margin-bottom: 20px;
              padding: 16px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
            }
            .question-header {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 10px;
            }
            .question-num {
              width: 24px;
              height: 24px;
              background: #6366f1;
              color: white;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 600;
              font-size: 13px;
            }
            .question-category {
              background: #ede9fe;
              color: #6366f1;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 12px;
            }
            .question-text {
              padding-left: 34px;
              color: #1f2937;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #9ca3af;
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleShare = async () => {
    const payload = {
      questions,
      summary,
      candidateName,
    };
    const json = JSON.stringify(payload);
    const encoded = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const url = `${window.location.origin}/share/${encoded}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `面试题 - ${candidateName || "候选人"}`,
          text: `AI 为 ${candidateName || "候选人"} 生成了 ${questions.length} 道面试题`,
          url,
        });
        return;
      } catch {
        // 用户取消
      }
    }
    navigator.clipboard.writeText(url).then(() => {
      toast.success("分享链接已复制");
    });
  };

  return (
    <div>
      {/* Action buttons */}
      <div className="mb-4 flex items-center justify-end gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-(--app-border) px-3 py-1.5 text-sm text-(--app-text-secondary) transition-colors hover:border-(--app-primary) hover:text-(--app-primary)"
        >
          <Copy className="h-4 w-4" />
          复制
        </button>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-1.5 rounded-lg border border-(--app-border) px-3 py-1.5 text-sm text-(--app-text-secondary) transition-colors hover:border-(--app-primary) hover:text-(--app-primary)"
        >
          <Printer className="h-4 w-4" />
          导出PDF
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 transition-colors hover:border-blue-400 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
        >
          <Share2 className="h-4 w-4" />
          分享
        </button>
      </div>

      {/* Document container */}
      <div
        ref={documentRef}
        className="rounded-2xl border border-(--app-border) bg-(--app-surface)"
      >
        {/* Header */}
        <div className="border-b border-(--app-border) p-6 text-center">
          <h2 className="text-lg font-semibold text-(--app-text-primary)">面试题</h2>
          {candidateName && (
            <p className="mt-1 text-sm text-(--app-text-secondary)">
              候选人：{candidateName}
            </p>
          )}
        </div>

        {/* Questions list - render as Markdown */}
        <div className="p-6">
          {/* Summary section - 总结概括风格 */}
          {summary && (
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
                <Sparkles className="h-4 w-4" />
                面试考察重点
              </h3>
              <div className="text-sm leading-relaxed text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                {summary}
              </div>
            </div>
          )}

          {/* Questions */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{`
## 面试题

${questions.map((q, i) => `
### 题目 ${i + 1}

**类别**：${q.category}

**问题**：${q.question}

${q.keyPoints.length > 0 ? `**考察要点**：\n${q.keyPoints.map(k => `- ${k}`).join("\n")}` : ""}

${q.followUp ? `**追问方向**：${q.followUp}` : ""}
`).join("\n---\n")}
`}</ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-(--app-border) p-4 text-center">
          <p className="text-xs text-(--app-text-muted)">
            由 AIScaning 面试题生成器制作
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Types
// ============================================================================

interface ResumeSelectorProps {
  resumes: Resume[];
  selectedResume: Resume | null;
  onSelect: (resume: Resume) => void;
  onUploadClick: () => void;
  loading: boolean;
}

// ============================================================================
// Sub-Components
// ============================================================================

const ACCEPT_TYPES = ".pdf,.doc,.docx";

function ResumeSelector({
  resumes,
  selectedResume,
  onSelect,
  onUploadClick,
  loading,
}: ResumeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = resumes.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const getFileIcon = (filename: string | null) => {
    const ext = filename?.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-xl border border-(--app-border) bg-(--app-surface) px-4 py-3 text-left transition-colors hover:border-(--app-border-strong) focus:border-(--app-primary) focus:outline-none focus:ring-2 focus:ring-(--app-ring)"
      >
        {selectedResume ? (
          <>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-semibold text-white">
              {selectedResume.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-(--app-text-primary)">
                {selectedResume.name}
              </p>
              <p className="truncate text-xs text-(--app-text-secondary)">
                {selectedResume.email || selectedResume.originalFileName || "无文件名"}
              </p>
            </div>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
          </>
        ) : (
          <>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--app-bg)">
              <FileText className="h-5 w-5 text-(--app-text-muted)" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-(--app-text-muted)">请选择简历</p>
            </div>
          </>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-(--app-text-muted) transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-(--app-border) bg-(--app-surface) shadow-lg">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-(--app-border) px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-(--app-text-muted)" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索简历姓名或邮箱..."
              className="flex-1 bg-transparent text-sm text-(--app-text-primary) placeholder:text-(--app-text-muted) focus:outline-none"
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-(--app-text-muted) hover:text-(--app-text-secondary)">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Upload button */}
          <button
            onClick={() => {
              setOpen(false);
              onUploadClick();
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-(--app-surface-raised)"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--app-primary)/10">
              <Upload className="h-4 w-4 text-(--app-primary)" />
            </div>
            <div>
              <p className="text-sm font-medium text-(--app-primary)">上传新简历</p>
              <p className="text-xs text-(--app-text-secondary)">支持 PDF、Word 格式</p>
            </div>
          </button>

          <div className="border-t border-(--app-border)" />

          {/* Resume list */}
          <div className="max-h-64 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-(--app-text-muted)" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-(--app-text-muted)">未找到简历</p>
              </div>
            ) : (
              filtered.map((resume) => (
                <button
                  key={resume.id}
                  onClick={() => {
                    onSelect(resume);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-(--app-surface-raised)"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--app-bg)">
                    {getFileIcon(resume.originalFileName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-(--app-text-primary)">
                      {resume.name}
                    </p>
                    <p className="truncate text-xs text-(--app-text-secondary)">
                      {resume.email || resume.originalFileName || ""}
                    </p>
                  </div>
                  {selectedResume?.id === resume.id && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UploadModal({
  isOpen,
  onClose,
  onSuccess,
  uploading,
  setUploading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (resume: Resume) => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const resume = await uploadResume({ file: selectedFile });
      toast.success("简历上传成功");
      onSuccess(resume);
      setSelectedFile(null);
      onClose();
    } catch {
      toast.error("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = () => {
    const ext = selectedFile?.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText className="h-8 w-8 text-red-500" />;
    if (ext === "docx" || ext === "doc") return <File className="h-8 w-8 text-blue-500" />;
    return <Upload className="h-8 w-8 text-(--app-text-muted)" />;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-(--app-primary) to-(--app-primary) shadow-(--app-shadow-sm)">
            <Upload className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-(--app-text-primary)">上传简历</span>
        </div>
      }
      size="md"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-(--app-border) bg-(--app-surface) px-4 py-2 text-sm font-medium text-(--app-text-secondary) hover:bg-(--app-surface-raised) hover:border-(--app-border-strong) transition-all disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex items-center gap-1.5 rounded-xl bg-(--app-primary) px-4 py-2 text-sm font-medium text-white shadow-(--app-shadow-sm) hover:bg-(--app-primary-hover) transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            {uploading ? "上传中..." : "开始上传"}
          </button>
        </div>
      }
    >
      <input
        ref={inputRef}
        id="interview-resume-upload"
        type="file"
        accept={ACCEPT_TYPES}
        className="sr-only"
        onChange={handleFileChange}
      />
      <label
        htmlFor="interview-resume-upload"
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        className={`
          block cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-6 text-center transition-colors
          ${selectedFile ? "border-(--app-primary)/30 bg-(--app-primary)/5" : "border-(--app-border) bg-(--app-surface-raised)/30 hover:border-(--app-border-strong) hover:bg-(--app-surface-raised)/50"}
        `}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-md ${
              selectedFile ? "bg-gradient-to-br from-(--app-primary)/80 to-(--app-primary)" : "bg-gradient-to-br from-(--app-skeleton) to-(--app-border)"
            }`}
          >
            <div className="text-white">{getFileIcon()}</div>
          </div>
          {selectedFile ? (
            <div>
              <p className="mb-0.5 text-sm font-semibold text-(--app-text-primary) truncate max-w-[20rem]">
                {selectedFile.name}
              </p>
              <p className="text-xs text-(--app-text-secondary)">{formatFileSize(selectedFile.size)}</p>
            </div>
          ) : (
            <div>
              <p className="mb-1 text-sm font-semibold text-(--app-text-primary)">
                点击或拖拽文件到此处
              </p>
              <p className="text-xs text-(--app-text-muted)">支持 PDF、Word 文档，最大 10MB</p>
            </div>
          )}
        </div>
      </label>
    </Modal>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function InterviewQuestions() {
  const navigate = useNavigate();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [aiConfigs, setAiConfigs] = useState<AiConfig[]>([]);
  const [selectedAiConfigId, setSelectedAiConfigId] = useState<number | null>(null);

  const [customFocus, setCustomFocus] = useState("");
  const [showFocusInput, setShowFocusInput] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);

  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [summary, setSummary] = useState("");

  // Load resumes list
  const loadResumes = async () => {
    setLoadingResumes(true);
    try {
      const data = await getResumes();
      setResumes(data);
    } catch {
      toast.error("加载简历列表失败");
    } finally {
      setLoadingResumes(false);
    }
  };

  // Load AI configs
  const loadAiConfigs = async () => {
    try {
      const configs = await getAiConfigs();
      setAiConfigs(configs);
      const defaultConfig = configs.find((c) => c.isDefault) || configs[0];
      if (defaultConfig) {
        setSelectedAiConfigId(defaultConfig.id);
      }
    } catch {
      toast.error("加载 AI 配置失败，请检查设置");
    }
  };

  useEffect(() => {
    loadResumes();
    loadAiConfigs();
  }, []);

  const handleSelectResume = async (resume: Resume) => {
    setSelectedResume(resume);
    setQuestions([]);
    setSummary("");
  };

  const handleUploadSuccess = (resume: Resume) => {
    setSelectedResume(resume);
    setQuestions([]);
    setSummary("");
    loadResumes();
  };

  const handleGenerate = async () => {
    if (!selectedResume) {
      toast.error("请先选择简历");
      return;
    }
    if (!selectedAiConfigId) {
      toast.error("请先选择 AI 配置");
      return;
    }
    if (questionCount === 0) {
      toast.error("题目数量不能为 0，请设置合理的题目数量");
      return;
    }

    setGenerating(true);
    setQuestions([]);
    setSummary("");
    try {
      const result = await generateInterviewQuestions({
        resumeId: selectedResume.id,
        customFocus: customFocus.trim() || undefined,
        aiConfigId: selectedAiConfigId,
        questionCount,
      });
      // 优先使用结构化数据，兜底从 raw summary 中提取题目
      const extractedQuestions = result.questions.length > 0
        ? result.questions
        : extractQuestionsFromRaw(result.summary);
      setQuestions(extractedQuestions);
      // summary 已经是纯文本（后端已分离）
      setSummary(result.summary || "");
      console.log("summaryText", result.summary);
      if (extractedQuestions.length > 0) {
        toast.success(`生成成功，共 ${extractedQuestions.length} 道面试题`);
      } else {
        toast.error("AI 返回格式异常，请重新生成");
      }
    } catch {
      toast.error("生成失败，请重试或检查 AI 配置");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyAll = () => {
    const blocks = [
      summary ? `面试考察重点：\n${summary}\n` : "",
      ...questions.map(
        (q, i) =>
          `${i + 1}. 【${q.category}】${q.question}`,
      ),
    ].filter(Boolean);
    navigator.clipboard.writeText(blocks.join("\n\n")).then(() => {
      toast.success("已复制到剪贴板");
    });
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  /** 将面试题数据编码为 URL-safe base64 并拼接分享链接 */
  const buildShareUrl = () => {
    const payload: Record<string, unknown> = {
      questions,
      summary,
    };
    if (selectedResume) {
      payload.candidateName = selectedResume.name;
      payload.resumePreview = selectedResume.parsedContent
        ? selectedResume.parsedContent.slice(0, 200)
        : undefined;
    }
    const json = JSON.stringify(payload);
    const encoded = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    return `${window.location.origin}/share/${encoded}`;
  };

  const handleShare = async () => {
    const url = buildShareUrl();
    // 优先尝试 Web Share API（移动端），降级为复制链接
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${selectedResume?.name ?? "候选人"}的面试题`,
          text: `AI 为 ${selectedResume?.name ?? "候选人"} 生成了 ${questions.length} 道面试题`,
          url,
        });
        return;
      } catch {
        // 用户取消分享，直接复制链接
      }
    }
    // 降级：复制链接
    navigator.clipboard.writeText(url).then(() => {
      toast.success("分享链接已复制，可直接发送给面试官");
    });
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-(--app-text-primary)">AI 面试题生成</h1>
            <p className="text-sm text-(--app-text-secondary)">
              基于简历内容，智能生成针对性面试题
            </p>
          </div>
        </div>
        {questions.length > 0 && (
          <button
            onClick={() => navigate(`/app/interview-questions?resumeId=${selectedResume?.id}`)}
            className="flex items-center gap-1.5 rounded-lg border border-(--app-border) px-3 py-1.5 text-sm text-(--app-text-secondary) transition-colors hover:border-(--app-border-strong) hover:text-(--app-text-primary)"
          >
            <RotateCw className="h-4 w-4" />
            重新选择
          </button>
        )}
      </div>

      {/* Step 1: Resume Selection */}
      <div className="rounded-2xl border border-(--app-border) bg-(--app-surface) p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-(--app-primary) text-xs font-semibold text-white">
            1
          </span>
          <h2 className="text-sm font-semibold text-(--app-text-primary)">选择简历</h2>
        </div>
        <ResumeSelector
          resumes={resumes}
          selectedResume={selectedResume}
          onSelect={handleSelectResume}
          onUploadClick={() => setShowUpload(true)}
          loading={loadingResumes}
        />
      </div>

      {/* Step 2: Configuration */}
      {selectedResume && (
        <div className="rounded-2xl border border-(--app-border) bg-(--app-surface) p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-(--app-primary) text-xs font-semibold text-white">
              2
            </span>
            <h2 className="text-sm font-semibold text-(--app-text-primary)">配置选项</h2>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-4">
            {/* AI Config */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-(--app-text-secondary)">AI 配置</label>
              <div className="relative">
                <select
                  value={selectedAiConfigId || ""}
                  onChange={(e) => setSelectedAiConfigId(e.target.value ? parseInt(e.target.value) : null)}
                  className="appearance-none rounded-lg border border-(--app-border) bg-(--app-bg) px-3 py-2 pr-8 text-sm text-(--app-text-primary) focus:border-(--app-primary) focus:outline-none focus:ring-2 focus:ring-(--app-ring)"
                >
                  <option value="">选择 AI 配置</option>
                  {aiConfigs.map((config) => (
                    <option key={config.id} value={config.id!}>
                      {config.name} {config.isDefault ? "(默认)" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-(--app-text-muted)" />
              </div>
            </div>

            {/* Question count */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-(--app-text-secondary)">题目数量</label>
              <div className="flex items-center rounded-lg border border-(--app-border) bg-(--app-bg)">
                <button
                  type="button"
                  onClick={() => setQuestionCount(Math.max(0, questionCount - 1))}
                  className="px-2.5 py-2 text-(--app-text-secondary) hover:text-(--app-primary) transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                  className="w-12 border-x border-(--app-border) bg-transparent py-2 text-center text-sm text-(--app-text-primary) focus:outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setQuestionCount(Math.min(20, questionCount + 1))}
                  className="px-2.5 py-2 text-(--app-text-secondary) hover:text-(--app-primary) transition-colors"
                >
                  +
                </button>
              </div>
              <span className="text-sm text-(--app-text-muted)">道</span>
            </div>

            {/* Custom focus */}
            <button
              onClick={() => setShowFocusInput((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                showFocusInput
                  ? "border-(--app-primary) bg-(--app-primary)/5 text-(--app-primary)"
                  : "border-(--app-border) text-(--app-text-secondary) hover:border-(--app-primary) hover:text-(--app-primary)"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              添加面试重点
              <ChevronDown className={`h-4 w-4 transition-transform ${showFocusInput ? "rotate-180" : ""}`} />
            </button>
          </div>

          {showFocusInput && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-(--app-text-secondary)">
                面试官重点关注方向（可选）
              </label>
              <textarea
                value={customFocus}
                onChange={(e) => setCustomFocus(e.target.value)}
                placeholder="例如：希望加强考察候选人在分布式系统方面的经验，以及对高并发场景的理解..."
                rows={3}
                className="w-full rounded-lg border border-(--app-border) bg-(--app-bg) p-3 text-sm text-(--app-text-primary) placeholder:text-(--app-text-muted) focus:border-(--app-primary) focus:outline-none focus:ring-2 focus:ring-(--app-ring)"
              />
              <p className="mt-1.5 text-xs text-(--app-text-muted)">
                添加后 AI 将针对这些方向加强提问
              </p>
            </div>
          )}

          {/* Resume preview */}
          {selectedResume.parsedContent && (
            <div className="mb-4 rounded-xl border border-(--app-border) bg-(--app-bg) p-4">
              <p className="mb-1 text-xs font-medium text-(--app-text-secondary)">简历内容预览</p>
              <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-(--app-text-secondary)">
                {selectedResume.parsedContent}
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedAiConfigId}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-3 font-medium text-white shadow-md transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                AI 正在生成面试题，请稍候...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                生成面试题
              </>
            )}
          </button>
        </div>
      )}

      {/* Generating skeleton */}
      {generating && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-8 text-center dark:border-blue-900 dark:bg-blue-950/20">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            AI 正在分析简历并生成面试题...
          </p>
          <p className="mt-1 text-xs text-blue-500 dark:text-blue-400">
            根据简历内容，结合项目经历和技术栈，生成针对性问题
          </p>
        </div>
      )}

      {/* Results — show when done generating (even if only raw summary came back) */}
      {!generating && (questions.length > 0 || summary) && (
        <>
          {/* Stats bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-(--app-text-secondary)">
                生成多道面试题
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 transition-colors hover:border-blue-400 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:border-blue-700 dark:hover:bg-blue-900/40"
              >
                <Share2 className="h-4 w-4" />
                分享
              </button>
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-1.5 rounded-lg border border-(--app-border) px-3 py-1.5 text-sm text-(--app-text-secondary) transition-colors hover:border-(--app-primary) hover:text-(--app-primary)"
              >
                <RotateCw className="h-4 w-4" />
                重新生成
              </button>
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 rounded-lg border border-(--app-border) px-3 py-1.5 text-sm text-(--app-text-secondary) transition-colors hover:border-(--app-primary) hover:text-(--app-primary)"
              >
                <Copy className="h-4 w-4" />
                复制全部
              </button>
            </div>
          </div>

          {/* Overview + raw fallback
          {(summary || questions.length > 0) && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5  ">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 overflow-x-hidden">
                <Sparkles className="h-4 w-4" />
                面试考察重点
              </h3>
              {summary ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
              ) : (
                <p className="text-sm text-blue-400 dark:text-blue-500">
                  AI 已生成面试题，请查看下方列表
                </p>
              )}
            </div>
          )} */}

          {/* Raw text fallback — when questions array is empty but summary has content */}
          {questions.length === 0 && summary && !generating && (
            <div className="rounded-2xl border border-(--app-border) bg-(--app-surface) p-6 shadow-sm">
              {/* Header */}
              <div className="mb-6 text-center">
                <h2 className="text-lg font-semibold text-(--app-text-primary)">面试题</h2>
                <p className="mt-1 text-sm text-(--app-text-secondary)">
                  根据简历内容自动生成
                </p>
              </div>

              {/* Divider */}
              <div className="mb-6 border-t border-(--app-border)" />

              {/* Parse questions from raw text */}
              <ExamQuestionList rawText={summary} />
            </div>
          )}

          {/* Question document */}
          {questions.length > 0 && (
            <QuestionDocument
              questions={questions}
              summary={summary}
              candidateName={selectedResume?.name}
            />
          )}
        </>
      )}

      {/* Empty state */}
      {!generating && questions.length === 0 && !selectedResume && (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-(--app-border) py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-(--app-bg)">
            <BookOpen className="h-8 w-8 text-(--app-text-muted)" />
          </div>
          <p className="text-(--app-text-secondary)">
            选择简历后，AI 将生成针对性面试题
          </p>
        </div>
      )}

      {/* Upload modal */}
      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={handleUploadSuccess}
        uploading={uploading}
        setUploading={setUploading}
      />
    </div>
  );
}
