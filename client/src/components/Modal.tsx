import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** 宽版弹窗（如简历预览） */
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  /** 覆盖默认内容区（默认含 padding、max-h-[60vh]、纵向滚动） */
  contentClassName?: string;
  /** 追加到面板根节点（如 `flex flex-col max-h-[92vh]` 用于大预览区） */
  panelClassName?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  "2xl": "max-w-6xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnOverlayClick = true,
  showCloseButton = true,
  contentClassName,
  panelClassName = "",
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // ESC 键关闭弹窗
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // 防止弹窗打开时背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // 点击遮罩层关闭
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className={`relative w-full ${sizeClasses[size]} bg-(--app-surface) rounded-2xl shadow-2xl transform animate-in zoom-in-95 fade-in duration-200 ${panelClassName}`.trim()}
        role="dialog"
        aria-modal="true"
      >
        {/* 头部 */}
        {(title || showCloseButton) && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-(--app-border) px-5 py-3.5">
            {title &&
              (typeof title === "string" ? (
                <h2 className="text-base font-semibold text-(--app-text-primary)">
                  {title}
                </h2>
              ) : (
                <div className="text-base font-semibold text-(--app-text-primary)">
                  {title}
                </div>
              ))}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1.5 text-(--app-text-muted) hover:text-(--app-text-primary) hover:bg-(--app-surface-raised) rounded-lg transition-all duration-150"
                aria-label="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* 内容区域 */}
        <div
          className={
            contentClassName ??
            "max-h-[60vh] overflow-y-auto px-5 py-4"
          }
        >
          {children}
        </div>

        {/* 底部按钮区域 */}
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-(--app-border) px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// 常用的确认弹窗
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "确认操作",
  message,
  confirmText = "确认",
  cancelText = "取消",
  confirmVariant = "primary",
  loading = false,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    if (!loading) {
      onConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-(--app-text-secondary) bg-(--app-surface) border border-(--app-border) rounded-lg hover:bg-(--app-surface-raised) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              confirmVariant === "danger"
                ? "bg-(--app-danger) hover:bg-red-600"
                : "bg-(--app-primary) hover:bg-(--app-primary-hover)"
            }`}
          >
            {loading ? "处理中..." : confirmText}
          </button>
        </>
      }
    >
      <p className="text-(--app-text-secondary) text-sm leading-relaxed">{message}</p>
    </Modal>
  );
}
