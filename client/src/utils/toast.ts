export type ToastType = "success" | "error" | "warning" | "info";

const TOAST_DURATION_MS = 3200;

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  /** 副文案，显示在主文案下方 */
  description?: string;
}

export type ToastOptions = {
  description?: string;
};

/** 全局 Toast 状态 - 导出供 Toast 组件使用 */
export const toastState = {
  toasts: [] as ToastItem[],
  listeners: [] as ((toasts: ToastItem[]) => void)[],
};

const notify = () => {
  toastState.listeners.forEach((fn) => fn([...toastState.toasts]));
};

function pushToast(
  message: string,
  type: ToastType,
  options?: ToastOptions,
) {
  const id = Math.random().toString(36).substring(2, 9);
  const item: ToastItem = {
    id,
    message,
    type,
    ...(options?.description
      ? { description: options.description }
      : {}),
  };
  toastState.toasts = [...toastState.toasts, item];
  notify();
  setTimeout(() => {
    toastState.toasts = toastState.toasts.filter((t) => t.id !== id);
    notify();
  }, TOAST_DURATION_MS);
}

/** Toast 函数（与 ToastContainer 配套使用） */
const toast = {
  success: (message: string, options?: ToastOptions) => {
    pushToast(message, "success", options);
  },
  error: (message: string, options?: ToastOptions) => {
    pushToast(message, "error", options);
  },
  warning: (message: string, options?: ToastOptions) => {
    pushToast(message, "warning", options);
  },
  info: (message: string, options?: ToastOptions) => {
    pushToast(message, "info", options);
  },
};

export default toast;
