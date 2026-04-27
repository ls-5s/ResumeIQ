import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface TestResult {
  status: "idle" | "testing" | "success" | "error";
  message: string;
}

interface StatusFeedbackProps {
  result: TestResult;
  onRetry?: () => void;
  labels?: {
    testing?: string;
    success?: string;
    error?: string;
  };
}

export function StatusFeedback({ result, onRetry, labels }: StatusFeedbackProps) {
  if (result.status === "idle") return null;

  const configs = {
    testing: {
      className: "border border-(--app-primary)/20 bg-(--app-primary-soft) text-(--app-primary-hover)",
      Icon: Loader2,
      title: labels?.testing ?? "正在处理...",
    },
    success: {
      className: "border border-(--app-success)/20 bg-(--app-success-soft) text-(--app-success)",
      Icon: CheckCircle2,
      title: labels?.success ?? "操作成功",
    },
    error: {
      className: "border border-(--app-danger)/20 bg-(--app-danger-soft) text-(--app-danger)",
      Icon: AlertCircle,
      title: labels?.error ?? "操作失败",
    },
  };

  const config = configs[result.status];

  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${config.className}`}>
      <config.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${result.status === "testing" ? "animate-spin" : ""}`} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{config.title}</p>
        {result.message && (
          <p className="mt-0.5 text-xs opacity-80">{result.message}</p>
        )}
      </div>
      {result.status !== "testing" && onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 rounded-lg p-1 text-current opacity-60 transition-opacity hover:opacity-100"
          title="重试"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
        </button>
      )}
    </div>
  );
}
