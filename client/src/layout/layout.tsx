import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Briefcase,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  ClipboardList,
  BookOpen,
} from "lucide-react";
import { useLoginStore } from "../store/Login";
import { UserInfo } from "../components/UserInfo";
import { ThemeSwitcher } from "../components/ThemeSwitcher";

const navItems = [
  { path: "/app", label: "仪表盘", icon: LayoutDashboard },
  { path: "/app/resumes", label: "简历管理", icon: FileText },
  { path: "/app/aiscreening", label: "AI 筛选", icon: Briefcase },
  { path: "/app/interview-questions", label: "面试题生成", icon: BookOpen },
  { path: "/app/screening-template", label: "筛选模版", icon: ClipboardList },
  { path: "/app/emails", label: "邮件群发", icon: Mail },
  { path: "/app/settings", label: "设置", icon: Settings },
];

/** 与侧栏宽度动画对齐（避免内联 style 触发 Edge Tools 提示） */
const sidebarMotionClass =
  "motion-safe:duration-[280ms] motion-safe:ease-[cubic-bezier(0.22_1_0.36_1)] motion-reduce:duration-0";

const logoBoxClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-linear-to-br from-[#0ea5e9] to-[#3b82f6] text-white shadow-[0_2px_8px_rgba(14,165,233,0.35)]";

function BrandGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2L2 7l10 5 10-5-10-5z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M2 17l10 5 10-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
      <path
        d="M2 12l10 5 10-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}

const toggleBtnClass =
  "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent transition-[color,background-color,transform] duration-150 hover:bg-(--app-sidebar-hover-bg) text-(--app-sidebar-text-muted) hover:text-(--app-sidebar-hover-text) active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-primary) focus-visible:ring-offset-2 motion-reduce:active:scale-100";

export default function Layout() {
  const location = useLocation();
  const { user } = useLoginStore();

  const [expanded, setExpanded] = useState(
    () => localStorage.getItem("sidebar-expanded") !== "false",
  );

  useEffect(() => {
    localStorage.setItem("sidebar-expanded", String(expanded));
  }, [expanded]);

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-(--app-page-bg)">
      {/* Sidebar */}
      <aside
        aria-label="主导航"
        className={`
          fixed left-0 top-0 bottom-0 flex flex-col z-40 overflow-hidden
          bg-(--app-sidebar-bg) border-r border-(--app-sidebar-border)
          motion-safe:transition-[width] motion-reduce:transition-none ${sidebarMotionClass}
          ${expanded ? "w-60" : "w-[72px]"}
        `}
      >
        {/* 顶栏：品牌 + 侧栏开关（展开/收起共用同一套视觉，避免突变） */}
        <div className="shrink-0 border-b border-(--app-sidebar-border)">
          <div
            className={
              expanded
                ? "flex items-center gap-1 pl-4 pr-2 py-[18px]"
                : "flex flex-col items-center gap-2 px-3 py-4"
            }
          >
            <Link
              to="/app"
              title="简历筛选"
              className={
                expanded
                  ? "flex min-w-0 flex-1 items-center gap-3 no-underline"
                  : "flex shrink-0 no-underline"
              }
            >
              <div className={logoBoxClass}>
                <BrandGlyph />
              </div>
              <span
                className={`min-w-0 truncate text-[15px] font-semibold tracking-tight text-(--app-sidebar-text-primary) motion-safe:transition-[opacity,max-width] motion-reduce:transition-none ${sidebarMotionClass} ${
                  expanded
                    ? "ml-0 max-w-[min(100%,12rem)] opacity-100"
                    : "ml-0 max-w-0 overflow-hidden opacity-0"
                }`}
              >
                简历筛选
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              title={expanded ? "收起侧栏" : "展开侧栏"}
              aria-label={expanded ? "收起侧边栏" : "展开侧边栏"}
              aria-expanded={expanded ? "true" : "false"}
              className={toggleBtnClass}
            >
              {expanded ? (
                <PanelLeftClose
                  className="h-[18px] w-[18px]"
                  strokeWidth={2}
                  aria-hidden
                />
              ) : (
                <PanelLeftOpen
                  className="h-[18px] w-[18px]"
                  strokeWidth={2}
                  aria-hidden
                />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto min-h-0">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/app" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                title={expanded ? undefined : item.label}
                className={`
                  flex items-center rounded-[10px] no-underline text-[14px] font-medium
                  motion-safe:transition-[padding,gap,background-color,color] motion-reduce:transition-none group ${sidebarMotionClass}
                  ${expanded ? "gap-3 px-3.5 py-2.5" : "justify-center gap-0 px-2 py-2.5"}
                  ${
                    isActive
                      ? "bg-linear-to-r from-(--app-sidebar-nav-active-from) to-(--app-sidebar-nav-active-to) text-(--app-sidebar-nav-active-text)"
                      : "text-(--app-sidebar-text-secondary) hover:bg-(--app-sidebar-hover-bg) hover:text-(--app-sidebar-hover-text)"
                  }
                `}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0 motion-safe:transition-transform motion-safe:duration-150 group-hover:scale-105 motion-reduce:group-hover:scale-100" />
                <span
                  className={`min-w-0 overflow-hidden whitespace-nowrap motion-safe:transition-[max-width,opacity] motion-reduce:transition-none ${sidebarMotionClass} ${
                    expanded
                      ? "max-w-[14rem] opacity-100"
                      : "max-w-0 opacity-0"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* 主题切换 */}
        <div
          className={`shrink-0 ${expanded ? "px-3 pt-3 pb-1" : "px-2 pt-3 pb-1"}`}
        >
          <ThemeSwitcher compact={!expanded} />
        </div>

        {/* User */}
        <div
          className={`border-t border-(--app-sidebar-border) shrink-0 ${expanded ? "px-3 py-3" : "px-2 py-3"}`}
        >
          <UserInfo username={user?.username} compact={!expanded} />
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`
          flex min-h-0 flex-1 flex-col overflow-y-auto
          motion-safe:transition-[margin-left] motion-reduce:transition-none ${sidebarMotionClass}
          ${expanded ? "ml-60" : "ml-[72px]"}
        `}
      >
        <Outlet />
      </main>
    </div>
  );
}
