import { useState, useCallback } from "react";
import { EmailTemplateList } from "../../components/emails/EmailTemplateList";
import { EmailSender } from "../../components/emails/EmailSender";
import { Send, Layers, Zap, Clock } from "lucide-react";
import { getEmailSendStats } from "../../api/email-template";

export default function EmailTemplates() {
  const [activeTab, setActiveTab] = useState<"templates" | "send">("templates");
  const [initialTemplateId, setInitialTemplateId] = useState<number | null>(
    null,
  );
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [emailSendStats, setEmailSendStats] = useState({
    totalSent: 0,
    todaySent: 0,
    monthSent: 0,
  });

  const refreshEmailSendStats = useCallback(async () => {
    try {
      const s = await getEmailSendStats();
      setEmailSendStats(s);
    } catch (e) {
      console.error("加载邮件发送统计失败:", e);
    }
  }, []);

  const handleUseTemplate = (template: { id: number }) => {
    setInitialTemplateId(template.id);
    setActiveTab("send");
    void refreshEmailSendStats();
  };

  const tabs = [
    {
      id: "templates" as const,
      label: "模板管理",
      sub: "创建与管理邮件模板",
      icon: Layers,
      accent: "from-sky-500 to-blue-500",
      ring: "ring-sky-500/25",
      iconColor: "text-sky-600",
      iconBg: "bg-sky-500/12",
    },
    {
      id: "send" as const,
      label: "发送邮件",
      sub: "选择模板与收件人",
      icon: Send,
      accent: "from-blue-500 to-sky-500",
      ring: "ring-blue-500/25",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-500/12",
    },
  ];

  return (
    <div
      className={
        activeTab === "send"
          ? "relative flex min-h-0 flex-1 flex-col overflow-hidden"
          : "relative flex w-full min-h-0 flex-col"
      }
    >
      {/* 页面弱氛围背景 */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,165,233,0.07),transparent)]"
        aria-hidden
      />

      <div
        className={
          activeTab === "send"
            ? "mx-auto flex min-h-0 w-full max-w-[1360px] flex-1 flex-col px-4 pb-6 pt-6 sm:px-6 lg:px-8"
            : "mx-auto w-full max-w-[1360px] px-4 pb-6 pt-6 sm:px-6 lg:px-8"
        }
      >
        {/* 页面头部：标题在左，分段控件靠右 */}
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-(--app-text-muted)">
              Email Hub
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-(--app-text-primary) sm:text-[1.75rem]">
              邮件管理
            </h1>
          </div>

          <div className="flex w-full shrink-0 justify-end lg:w-auto">
            {/* Tab：浅灰轨道 + 选中白底浮起；激活态图标为渐变实心 */}
            <div
              role="group"
              aria-label="邮件功能切换"
              className="flex w-full max-w-md items-stretch gap-1 rounded-2xl border border-(--app-border) bg-(--app-surface-raised) p-1 shadow-[inset_0_1px_0_var(--app-border,rgba(255,255,255,0.5))] sm:ml-auto sm:w-auto sm:max-w-none"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === "send") void refreshEmailSendStats();
                    }}
                    title={tab.sub}
                    aria-label={
                      isActive ? `${tab.label}（当前）` : `切换到${tab.label}`
                    }
                    aria-current={isActive ? "page" : undefined}
                    className={`
                      group/tab flex flex-1 items-center justify-center gap-2 rounded-[0.875rem] px-3 py-2.5
                      text-sm font-medium transition-all duration-200 sm:flex-none sm:justify-start sm:px-4
                      ${
                        isActive
                          ? "bg-(--app-surface) text-(--app-text-primary) shadow-(--app-shadow-sm) ring-1 ring-(--app-border)"
                          : "text-(--app-text-secondary) hover:bg-(--app-surface)/55 hover:text-(--app-text-primary)"
                      }
                    `}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                        isActive
                          ? `bg-linear-to-br ${tab.accent} text-white shadow-[0_2px_8px_-2px_rgba(14,165,233,0.4)]`
                          : "bg-(--app-surface-raised) text-(--app-text-muted) group-hover/tab:bg-(--app-surface) group-hover/tab:text-(--app-text-secondary)"
                      }`}
                    >
                      <Icon className="h-[15px] w-[15px]" strokeWidth={1.85} />
                    </span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* 发送页统计 Strip（仅发送页显示） */}
        {activeTab === "send" && (
          <section
            aria-label="邮件统计"
            className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {[
              {
                icon: Layers,
                desc: "可用模板",
                value: totalTemplates,
                accent: "text-sky-600",
                iconBg: "bg-sky-500/12",
                bar: "border-t-sky-500/90",
              },
              {
                icon: Send,
                desc: "已发送",
                value: emailSendStats.totalSent,
                accent: "text-sky-600",
                iconBg: "bg-sky-500/12",
                bar: "border-t-sky-500/90",
              },
              {
                icon: Clock,
                desc: "今日发送",
                value: emailSendStats.todaySent,
                accent: "text-amber-600",
                iconBg: "bg-amber-500/12",
                bar: "border-t-amber-500/90",
              },
              {
                icon: Zap,
                desc: "本月发送",
                value: emailSendStats.monthSent,
                accent: "text-emerald-600",
                iconBg: "bg-emerald-500/12",
                bar: "border-t-emerald-500/90",
              },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.desc}
                  className={`
                    group relative flex flex-col rounded-2xl border
                    bg-(--app-surface) dark:bg-(--app-surface)
                    border-(--app-border) dark:border-(--app-border)
                    px-5 py-5 shadow-(--app-shadow-sm)
                    ring-1 ring-(--app-border-subtle) dark:ring-(--app-border-subtle)
                    transition-all duration-300 ease-out
                    hover:-translate-y-0.5 hover:shadow-(--app-shadow)
                    sm:px-6 sm:py-6
                    ${m.bar} border-t-[3px]
                  `}
                >
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-(--app-text-muted)">
                      {m.desc}
                    </span>
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${m.iconBg} ${m.accent} transition-transform duration-300 group-hover:scale-105`}
                    >
                      <Icon
                        className="h-[18px] w-[18px]"
                        strokeWidth={1.75}
                      />
                    </div>
                  </div>
                  <p className="text-3xl font-semibold tabular-nums tracking-tight text-(--app-text-primary) lg:text-[2rem]">
                    {m.value.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </section>
        )}

        {/* 内容区域：发送页占满剩余高度，避免整页再出现外层滚动条 */}
        <div
          className={
            activeTab === "send"
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : ""
          }
        >
          {activeTab === "templates" && (
            <EmailTemplateList onUseTemplate={handleUseTemplate} />
          )}
          {activeTab === "send" && (
            <EmailSender
              initialTemplateId={initialTemplateId}
              onInitialTemplateApplied={() => setInitialTemplateId(null)}
              onTemplateCount={(count) => setTotalTemplates(count)}
              onRefresh={refreshEmailSendStats}
            />
          )}
        </div>
      </div>
    </div>
  );
}
