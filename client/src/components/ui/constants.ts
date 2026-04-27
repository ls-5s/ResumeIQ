// 共享主题常量

export const THEME_COLORS = {
  primary: {
    from: "from-sky-600",
    to: "to-blue-600",
    ring: "focus:ring-sky-500",
  },
  success: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  },
  error: {
    border: "border-red-200",
    bg: "bg-red-50",
    text: "text-red-700",
  },
  warning: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  info: {
    border: "border-sky-200",
    bg: "bg-sky-50",
    text: "text-sky-700",
  },
} as const;

export const CARD_STYLES = {
  container: "rounded-3xl border border-zinc-200/70 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] ring-1 ring-zinc-950/3",
  header: "border-b border-zinc-100 p-6",
  content: "p-6",
} as const;

export const BUTTON_STYLES = {
  primary: "bg-linear-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-500/25 hover:shadow-xl hover:-translate-y-0.5",
  primarySm: "bg-linear-to-r from-sky-600 to-blue-600 text-white shadow-sm hover:brightness-105",
  secondary: "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50",
  secondarySm: "bg-white border border-zinc-200/80 text-zinc-600 hover:bg-zinc-50 text-xs px-3 py-1.5",
  danger: "bg-white border border-red-200 text-red-600 hover:bg-red-50",
} as const;

export const INPUT_STYLES = {
  base: "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500",
} as const;

// 共享表单默认值
export const DEFAULT_EMAIL_FORM = {
  email: "",
  authCode: "",
  imapHost: "imap.qq.com",
  imapPort: 993,
  smtpHost: "smtp.qq.com",
  smtpPort: 465,
  isDefault: false,
} as const;

export const DEFAULT_AI_FORM = {
  name: "",
  model: "gpt-4o",
  apiUrl: "https://api.openai.com/v1",
  apiKey: "",
  prompt: "",
  isDefault: false,
} as const;
