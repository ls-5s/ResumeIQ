import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Copy,
  Check,
  BookOpen,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import type { InterviewQuestion } from "../../types/ai";

interface ShareData {
  questions: InterviewQuestion[];
  summary?: string;
  candidateName?: string;
  resumePreview?: string;
}

function decodeShareData(encoded: string): ShareData | null {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = decodeURIComponent(escape(atob(padded)));
    return JSON.parse(decoded) as ShareData;
  } catch {
    return null;
  }
}

export default function ShareQuestion() {
  const { data: encoded } = useParams<{ data: string }>();

  const [copiedAll, setCopiedAll] = useState(false);

  const decoded = useMemo(
    () => (encoded ? decodeShareData(encoded) : null),
    [encoded],
  );

  const handleCopyAll = () => {
    if (!decoded) return;
    const blocks = decoded.questions.map(
      (q, i) => `${i + 1}. ${q.question}`,
    );
    navigator.clipboard.writeText(blocks.join("\n\n")).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  };

  if (!encoded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
          <h1 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
            链接无效
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            此面试题链接已失效或格式不正确
          </p>
        </div>
      </div>
    );
  }

  if (!decoded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-300" />
          <h1 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
            无法解析分享内容
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            该链接数据已损坏，请重新生成分享链接
          </p>
        </div>
      </div>
    );
  }

  const { questions, candidateName } = decoded;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-sm">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                AI 面试题
              </h1>
              {candidateName && (
                <p className="text-xs text-zinc-400">候选人：{candidateName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 shadow-sm transition-colors hover:border-zinc-400 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
            >
              {copiedAll ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  复制全部
                </>
              )}
            </button>
            <a
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 shadow-sm transition-colors hover:border-zinc-400 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
            >
              <ExternalLink className="h-4 w-4" />
              试用 AIScaning
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Hero banner */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            AI 生成的面试题
          </h2>
          {candidateName && (
            <p className="mt-1 text-sm text-zinc-500">
              为候选人「{candidateName}」定制
            </p>
          )}
        </div>

        {/* Document container */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {/* Header */}
          <div className="border-b border-zinc-200 p-6 text-center dark:border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              面试题
            </h3>
            {candidateName && (
              <p className="mt-1 text-sm text-zinc-500">候选人：{candidateName}</p>
            )}
          </div>

          {/* Questions list */}
          <div className="p-6">
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-purple-500 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    {question.category && (
                      <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                        {question.category}
                      </span>
                    )}
                  </div>
                  <p className="pl-8 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {question.question}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-200 p-4 text-center dark:border-zinc-800">
            <p className="text-xs text-zinc-400">
              由 AIScaning 面试题生成器制作
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
