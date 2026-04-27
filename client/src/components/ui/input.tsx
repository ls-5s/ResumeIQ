import { forwardRef, type ComponentPropsWithoutRef } from "react";

/** 与项目主题变量一致的基础输入框，供筛选栏等复用 */
export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text-primary) shadow-sm placeholder:text-(--app-text-muted) focus:border-(--app-primary) focus:outline-none focus:ring-1 focus:ring-(--app-ring) disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
      {...props}
    />
  ),
);
Input.displayName = "Input";
