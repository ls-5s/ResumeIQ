import {
  Upload,
  FileText,
  Loader2,
  Mail,
  AlertCircle,
  CheckCircle2,
  Inbox,
  File,
} from "lucide-react";
import { Modal } from "../Modal";
import { formatFileSize } from "../../utils/format";
import type { EmailConfig } from "../../types/email";

// ============================================================================
// Types
// ============================================================================

export type ResumeModalType = "upload" | "import";

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ResumeModalType;
  selectedFile?: File | null;
  onFileChange?: (file: File | null) => void;
  onUpload?: () => void;
  uploading?: boolean;
  emailConfigs?: EmailConfig[];
  loadingConfigs?: boolean;
  selectedConfigId?: number | null;
  onConfigChange?: (id: number | null) => void;
  onImport?: () => void;
  importing?: boolean;
}

// ============================================================================
// Upload Section Components
// ============================================================================

const ACCEPT_TYPES = ".pdf,.doc,.docx";

interface DropZoneProps {
  selectedFile: File | null;
  onFileChange?: (file: File | null) => void;
}

const DropZone = ({ selectedFile, onFileChange }: DropZoneProps) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onFileChange?.(file ?? null);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onFileChange?.(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const getFileIcon = () => {
    const ext = selectedFile?.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText className="h-8 w-8" />;
    if (ext === "docx" || ext === "doc") return <File className="h-8 w-8" />;
    return <Upload className="h-8 w-8" />;
  };

  const getFileGradient = () => {
    if (!selectedFile) return "from-(--app-skeleton) to-(--app-border)";
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "from-(--app-danger) to-(--app-danger)";
    if (ext === "docx" || ext === "doc") return "from-(--app-primary) to-(--app-primary)";
    return "from-(--app-primary) to-(--app-primary)";
  };

  const inputId = "resume-upload-input";

  return (
    <>
      <input
        id={inputId}
        type="file"
        accept={ACCEPT_TYPES}
        className="sr-only"
        onChange={handleInputChange}
        aria-label="选择简历文件（PDF 或 Word）"
      />
      <label
        htmlFor={inputId}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          block overflow-hidden rounded-2xl border-2 border-dashed
          ${selectedFile ? "border-(--app-primary)/20 bg-(--app-primary-soft)/40" : "border-(--app-border) bg-(--app-surface-raised)/30"}
          ${onFileChange ? "cursor-pointer transition-colors hover:border-(--app-border-strong) hover:bg-(--app-surface-raised)/50" : ""}
        `}
      >
        <div className="p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            {/* Icon */}
            <div
              className={`
              flex h-14 w-14 items-center justify-center rounded-2xl
              bg-linear-to-br ${getFileGradient()} shadow-md
            `}
            >
              <div className="text-white">{getFileIcon()}</div>
            </div>

            {selectedFile ? (
              <>
                {/* File Info */}
                <div>
                  <p className="text-sm font-semibold text-(--app-text-primary) mb-0.5 truncate max-w-[20rem]">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-(--app-text-secondary)">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </>
            ) : (
              /* Empty state */
              <div>
                <p className="text-sm font-semibold text-(--app-text-primary) mb-1">
                  点击或拖拽文件到此处
                </p>
                <p className="text-xs text-(--app-text-muted)">
                  支持 PDF、Word 文档，最大 10MB
                </p>
              </div>
            )}
          </div>
        </div>
      </label>
    </>
  );
};

// ============================================================================
// Import Section Components
// ============================================================================

interface ImportSectionProps {
  emailConfigs: EmailConfig[];
  loadingConfigs: boolean;
  selectedConfigId: number | null;
  onConfigChange: (id: number | null) => void;
}

const ImportSection = ({
  emailConfigs,
  loadingConfigs,
  selectedConfigId,
  onConfigChange,
}: ImportSectionProps) => {
  if (loadingConfigs) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-(--app-primary) to-(--app-primary) shadow-(--app-shadow-primary)">
          <Loader2 className="h-7 w-7 animate-spin text-white" />
        </div>
      </div>
    );
  }

  if (emailConfigs.length === 0) {
    return (
      <div className="space-y-6 py-6 text-center">
        {/* Empty State */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-(--app-skeleton) to-(--app-border) shadow-inner">
            <Inbox className="h-10 w-10 text-(--app-text-muted)" />
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-lg font-semibold text-(--app-text-primary)">
            暂无邮箱配置
          </h3>
          <p className="text-sm text-(--app-text-secondary)">
            请先在设置中添加邮箱配置后再导入简历
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Config Selection */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-(--app-text-secondary)">
          <Mail className="h-4 w-4 text-(--app-primary)" />
          选择邮箱账号
        </label>
        <div className="relative">
          <select
            aria-label="选择邮箱账号"
            value={selectedConfigId || ""}
            onChange={(e) => onConfigChange(Number(e.target.value) || null)}
            className="
              w-full appearance-none rounded-xl border border-(--app-border)
              bg-(--app-surface) px-4 py-3 pr-10 text-sm text-(--app-text-primary)
              focus:border-(--app-primary) focus:outline-none focus:ring-2
              focus:ring-(--app-ring) transition-all
              cursor-pointer hover:border-(--app-primary)/20
            "
          >
            <option value="">请选择邮箱</option>
            {emailConfigs.map((config) => (
              <option key={config.id} value={config.id}>
                {config.email}
              </option>
            ))}
          </select>
          {/* Custom dropdown arrow */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
            <svg
              className="h-4 w-4 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="relative overflow-hidden rounded-2xl border border-(--app-primary)/10 bg-gradient-to-br from-(--app-primary-soft)/90 to-(--app-primary-soft)/80 p-5">
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-(--app-primary)/10" />

        <div className="relative flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--app-primary)/10">
            <AlertCircle className="h-5 w-5 text-(--app-primary)" />
          </div>
          <div>
            <h4 className="mb-1 text-sm font-semibold text-(--app-text-primary)">
              导入说明
            </h4>
            <p className="text-sm leading-relaxed text-(--app-text-secondary)">
              系统将自动扫描该邮箱最近{" "}
              <span className="font-semibold text-(--app-primary)">7 天</span>{" "}
              的邮件，查找包含 PDF 或 Word 格式简历附件的邮件并导入。
            </p>
          </div>
        </div>
      </div>

      {/* Selected Config Preview */}
      {selectedConfigId && (
        <div className="rounded-xl bg-(--app-surface-raised) p-4">
          {(() => {
            const config = emailConfigs.find((c) => c.id === selectedConfigId);
            if (!config) return null;
            return (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-(--app-primary) to-(--app-primary) shadow-(--app-shadow-sm)">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-(--app-text-primary)">
                    {config.email}
                  </p>
                  <p className="text-xs text-(--app-text-secondary)">
                    将从此邮箱导入简历附件
                  </p>
                </div>
                <CheckCircle2 className="ml-auto h-5 w-5 text-(--app-success)" />
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function ResumeModal({
  isOpen,
  onClose,
  type,
  selectedFile,
  onFileChange,
  onUpload,
  uploading,
  emailConfigs = [],
  loadingConfigs,
  selectedConfigId,
  onConfigChange,
  onImport,
  importing,
}: ResumeModalProps) {
  const handleClose = () => {
    if (type === "upload" && onFileChange) {
      onFileChange(null);
    }
    onClose();
  };

  const isUpload = type === "upload";

  const getModalTitle = () => {
    if (isUpload) {
      return (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-(--app-primary) to-(--app-primary) shadow-(--app-shadow-sm)">
            <Upload className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-(--app-text-primary)">上传简历</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-(--app-primary) to-(--app-primary) shadow-(--app-shadow-sm)">
            <Mail className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-(--app-text-primary)">从邮箱导入</span>
      </div>
    );
  };

  const getSubmitButtonContent = () => {
    if (isUpload) {
      return (
        <>
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          {uploading ? "上传中..." : "开始上传"}
        </>
      );
    }
    return (
      <>
        {importing && <Loader2 className="h-4 w-4 animate-spin" />}
        {importing ? "导入中..." : "开始导入"}
      </>
    );
  };

  const isSubmitDisabled = isUpload
    ? !selectedFile || uploading
    : !selectedConfigId || importing || emailConfigs.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getModalTitle()}
      size="md"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button
            onClick={handleClose}
            className="
              rounded-xl border border-(--app-border) bg-(--app-surface) px-4 py-2
              text-sm font-medium text-(--app-text-secondary)
              hover:bg-(--app-surface-raised) hover:border-(--app-border-strong)
              transition-all disabled:opacity-50
            "
          >
            取消
          </button>
          <button
            onClick={isUpload ? onUpload : onImport}
            disabled={isSubmitDisabled}
            className="
              flex items-center gap-1.5 rounded-xl
              bg-(--app-primary) px-4 py-2 text-sm font-medium text-white
              shadow-(--app-shadow-sm) hover:bg-(--app-primary-hover)
              transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-(--app-primary)
            "
          >
            {getSubmitButtonContent()}
          </button>
        </div>
      }
    >
      {isUpload ? (
        <DropZone
          selectedFile={selectedFile || null}
          onFileChange={onFileChange}
        />
      ) : (
        <ImportSection
          emailConfigs={emailConfigs}
          loadingConfigs={loadingConfigs || false}
          selectedConfigId={selectedConfigId || null}
          onConfigChange={onConfigChange || (() => {})}
        />
      )}
    </Modal>
  );
}
