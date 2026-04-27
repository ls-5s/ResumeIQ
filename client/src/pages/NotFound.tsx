import { Link } from "react-router-dom";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 flex items-center justify-center">
      {/* 装饰背景 */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[60vh] w-[80vw] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(14,165,233,0.12),transparent)]" />
        <div className="absolute bottom-0 right-0 h-[40vh] w-[50vw] bg-[radial-gradient(ellipse_50%_40%_at_80%_100%,rgba(59,130,246,0.07),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-size-[48px_48px]" />
      </div>

      {/* 装饰圆点 */}
      <div className="pointer-events-none absolute right-16 top-1/4 h-2 w-2 rounded-full bg-sky-400/40" aria-hidden />
      <div className="pointer-events-none absolute left-20 bottom-1/3 h-3 w-3 rounded-full bg-blue-400/30" aria-hidden />
      <div className="pointer-events-none absolute right-1/4 top-1/3 h-1.5 w-1.5 rounded-full bg-sky-300/50" aria-hidden />

      <div className="text-center px-4">
        {/* 404 大字 */}
        <div className="relative inline-block">
          <span className="select-none text-[10rem] font-bold leading-none tracking-tighter text-zinc-100/70 sm:text-[14rem]">
            404
          </span>
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="text-[5rem] font-bold leading-none tracking-tighter text-zinc-300 sm:text-[7rem]">
              404
            </span>
          </span>
        </div>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          页面未找到
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-zinc-400 sm:max-w-md sm:text-base">
          您访问的页面不存在或已被移除，可能已被删除或链接有误。
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition-all hover:bg-sky-600 hover:shadow-sky-500/40 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 active:translate-y-0"
          >
            <Home className="h-4 w-4" />
            返回首页
        </Link>
        </div>
      </div>
    </div>
  );
}
