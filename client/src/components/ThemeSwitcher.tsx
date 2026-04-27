import { motion, LayoutGroup } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useThemeStore, type ThemeMode } from "../store/theme";

const SPRING = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
  mass: 0.6,
};
const SPRING_SOFT = { type: "spring" as const, stiffness: 320, damping: 28 };

const OPTIONS: {
  value: ThemeMode;
  label: string;
  icon: typeof Sun;
  title: string;
}[] = [
  {
    value: "light",
    label: "浅色",
    icon: Sun,
    title: "浅色模式",
  },
  {
    value: "dark",
    label: "深色",
    icon: Moon,
    title: "深色模式",
  },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useThemeStore();

  if (compact) {
    const active = OPTIONS.find((o) => o.value === mode);
    const ActiveIcon = active?.icon ?? Sun;
    return (
      <button
        type="button"
        onClick={() => {
          const idx = OPTIONS.findIndex((o) => o.value === mode);
          const next = OPTIONS[(idx + 1) % OPTIONS.length];
          setMode(next.value);
        }}
        title={active?.title}
        aria-label={active?.title}
        className="group relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-transparent bg-transparent text-(--app-text-secondary) transition-colors duration-200 hover:border-(--app-border) hover:bg-(--app-surface-raised) hover:text-(--app-primary) active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-sidebar-bg)"
      >
        <motion.span
          key={mode}
          initial={{ opacity: 0, scale: 0.65, rotate: -25 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={SPRING}
          className="flex items-center justify-center"
        >
          <ActiveIcon className="size-[17px]" strokeWidth={2} aria-hidden />
        </motion.span>
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="选择主题"
      className="w-full rounded-2xl bg-(--app-border-subtle) p-[3px] ring-1 ring-(--app-border) dark:bg-white/4 dark:ring-white/10"
    >
      <LayoutGroup id="theme-switcher">
        <div className="grid grid-cols-2 gap-[3px]">
          {OPTIONS.map((opt) => {
            const isActive = mode === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                aria-current={isActive ? "true" : undefined}
                data-value={opt.value}
                onClick={() => setMode(opt.value)}
                title={opt.title}
                aria-label={opt.title}
                className="group relative flex min-h-13 flex-col items-center justify-center rounded-[10px] px-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-ring) focus-visible:ring-offset-1 focus-visible:ring-offset-(--app-border-subtle)"
              >
                {isActive ? (
                  <motion.div
                    layoutId="theme-switcher-pill"
                    className="absolute inset-px rounded-[9px] bg-(--app-surface) shadow-(--app-shadow-sm) ring-1 ring-(--app-border)/60 dark:bg-(--app-surface-raised) dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)] dark:ring-white/10"
                    transition={SPRING}
                    aria-hidden
                  />
                ) : null}

                <motion.span
                  className="relative z-10 flex flex-col items-center justify-center gap-0.5"
                  initial={false}
                  animate={{
                    scale: isActive ? 1 : 0.97,
                    opacity: isActive ? 1 : 0.72,
                  }}
                  transition={SPRING_SOFT}
                  whileHover={
                    isActive ? undefined : { scale: 1.02, opacity: 0.95 }
                  }
                  whileTap={{ scale: 0.94 }}
                >
                  <motion.span
                    animate={{
                      color: isActive
                        ? "var(--app-primary)"
                        : "var(--app-text-muted)",
                    }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center justify-center"
                  >
                    <Icon
                      className="size-4 shrink-0"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </motion.span>
                  <span
                    className={`text-[10px] font-semibold leading-none tracking-wide transition-colors duration-200 ${
                      isActive
                        ? "text-(--app-text-primary)"
                        : "text-(--app-text-muted) group-hover:text-(--app-text-secondary)"
                    }`}
                  >
                    {opt.label}
                  </span>
                </motion.span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}
