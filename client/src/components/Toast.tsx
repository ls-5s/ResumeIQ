import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";
import { useState, useEffect, type ReactElement } from "react";
import { toastState } from "../utils/toast";
import type { ToastItem, ToastType } from "../utils/toast";

/** Toast 容器组件 - 需要在 App 中渲染 */
export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = (newToasts: ToastItem[]) => setItems(newToasts);
    toastState.listeners.push(listener);
    return () => {
      toastState.listeners = toastState.listeners.filter((l) => l !== listener);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-[110] flex max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: ToastItem }) {
  const icons: Record<ToastType, ReactElement> = {
    success: <CheckCircle className="size-5 shrink-0 text-emerald-600" />,
    error: <XCircle className="size-5 shrink-0 text-rose-600" />,
    warning: <AlertCircle className="size-5 shrink-0 text-amber-600" />,
    info: <Info className="size-5 shrink-0 text-sky-600" />,
  };

  const styles: Record<ToastType, string> = {
    success:
      "border-emerald-200/90 bg-emerald-50 text-emerald-950 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.15)]",
    error:
      "border-rose-200/90 bg-rose-50 text-rose-950 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.15)]",
    warning:
      "border-amber-200/90 bg-amber-50 text-amber-950 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.15)]",
    info: "border-sky-200/90 bg-sky-50 text-sky-950 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.15)]",
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${styles[toast.type]}`}
      role="alert"
    >
      {icons[toast.type]}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{toast.message}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs font-normal leading-relaxed opacity-85">
            {toast.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
