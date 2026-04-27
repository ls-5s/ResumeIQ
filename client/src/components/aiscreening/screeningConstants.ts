export const SCREENING_STATUS_META = {
  pending: {
    badge: "bg-(--app-ai-soft) text-(--app-primary) border border-(--app-ai-border)",
    dot: "bg-(--app-primary)",
    label: "待筛选",
  },
  passed: {
    badge: "bg-(--app-primary) text-white border border-(--app-primary)",
    dot: "bg-(--app-primary)/30",
    label: "已通过",
  },
  rejected: {
    badge: "bg-(--app-surface) text-(--app-primary) border border-(--app-ai-border)",
    dot: "bg-(--app-primary)/30",
    label: "已拒绝",
  },
} as const;
