import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Bot,
  Mail,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

interface QuickActionItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

const actions: QuickActionItem[] = [
  { to: "/app", icon: LayoutDashboard, label: "工作台" },
  { to: "/app/resumes", icon: FileText, label: "简历" },
  { to: "/app/aiscreening", icon: Bot, label: "AI 筛选" },
  { to: "/app/emails", icon: Mail, label: "邮件" },
  { to: "/app/emails", icon: Users, label: "面试邀请" },
  { to: "/app/settings", icon: Settings, label: "设置" },
];

export function QuickActions() {
  return (
    <section className="rounded-3xl border border-(--app-border) bg-(--app-surface) px-4 py-5 shadow-(--app-shadow-sm) ring-1 ring-(--app-border-subtle) sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-(--app-text-muted)">
          快捷入口
        </h2>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={`${action.to}-${action.label}`}
              to={action.to}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-(--app-border) bg-(--app-surface-raised) px-2 py-3.5 text-center no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-(--app-primary)/20 hover:bg-(--app-surface) hover:shadow-md hover:shadow-(--app-primary)/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-primary)/25"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--app-surface) text-(--app-primary) shadow-sm ring-1 ring-(--app-border) transition-transform duration-200 group-hover:scale-105 group-hover:text-(--app-primary-hover)">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <span className="line-clamp-2 text-[11px] font-medium leading-tight text-(--app-text-secondary) group-hover:text-(--app-text-primary)">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default QuickActions;
