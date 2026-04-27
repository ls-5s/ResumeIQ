import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import mammoth from "mammoth";
import { Modal } from "../Modal";

type PreviewFileType = "pdf" | "docx" | "doc" | "other";

interface ResumePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  fileName: string | null;
  fileType: string | null;
}

const getPreviewType = (
  fileType: string | null,
  fileName: string | null,
): PreviewFileType => {
  const ext = (fileType || fileName?.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "doc") return "doc";
  return "other";
};

export function ResumePreviewModal({
  isOpen,
  onClose,
  url,
  fileName,
  fileType,
}: ResumePreviewModalProps) {
  const previewType = useMemo(
    () => getPreviewType(fileType, fileName),
    [fileType, fileName],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string>("");

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setError(null);
      setDocxHtml("");
      return;
    }

    if (!url) return;
    if (previewType !== "docx") return;

    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`文件获取失败：${res.status}`);
        const arrayBuffer = await res.arrayBuffer();

        const { value } = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) setDocxHtml(value || "");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "预览失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, url, previewType]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      panelClassName="flex max-h-[min(92vh,900px)] flex-col overflow-hidden"
      contentClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0"
      title={
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 pr-1">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-(--app-text-primary)">
              {fileName || "简历预览"}
            </p>
            <p className="text-xs font-normal text-(--app-text-secondary)">
              {previewType.toUpperCase()} 预览
            </p>
          </div>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-(--app-primary) px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-(--app-primary-hover)"
            >
              <ExternalLink size={16} />
              新窗口打开
            </a>
          ) : null}
        </div>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-(--app-surface-raised)/80">
        {previewType === "pdf" ? (
          <iframe
            src={url || undefined}
            className="min-h-0 min-w-0 flex-1 border-0"
            title="PDF Preview"
          />
        ) : previewType === "docx" ? (
          loading ? (
            <div className="flex min-h-[200px] flex-1 items-center justify-center">
              <Loader2
                className="animate-spin text-(--app-text-muted)"
                size={36}
              />
            </div>
          ) : error ? (
            <div className="flex min-h-[200px] flex-1 items-center justify-center px-6 text-center text-sm text-(--app-text-secondary)">
              {error}
            </div>
          ) : docxHtml ? (
            <div className="min-h-0 flex-1 overflow-y-auto bg-(--app-surface)">
              <div className="mx-auto max-w-5xl p-8">
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: docxHtml }}
                />
              </div>
            </div>
          ) : (
            <div className="flex min-h-[200px] flex-1 items-center justify-center px-6 text-center text-sm text-(--app-text-secondary)">
              未读取到可预览内容
            </div>
          )
        ) : (
          <div className="flex min-h-[200px] flex-1 items-center justify-center px-6 text-center text-sm text-(--app-text-secondary)">
            {previewType === "doc"
              ? "暂不支持 DOC 预览，请下载后查看"
              : "暂不支持该格式预览，请下载后查看"}
          </div>
        )}
      </div>
    </Modal>
  );
}
