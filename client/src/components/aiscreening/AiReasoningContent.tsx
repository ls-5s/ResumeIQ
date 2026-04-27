import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * 豆包式阅读：白底卡片感、柔和分区、略大字重与行高，便于长文评估
 */
const mdComponents: Components = {
  h1: ({ children, ...props }) => (
    <h2
      className="mb-4 mt-0 text-lg font-semibold tracking-tight text-(--md-text-primary) first:mt-0"
      {...props}
    >
      {children}
    </h2>
  ),
  h2: ({ children, ...props }) => (
    <h3
      className="mb-3 mt-8 flex scroll-mt-4 flex-wrap items-center gap-2 rounded-xl bg-linear-to-r from-(--md-heading-bg-from) to-(--md-heading-bg-to) px-3.5 py-2.5 text-[15px] font-semibold text-(--md-text-primary) shadow-(--app-shadow-sm) ring-1 ring-(--md-heading-border) first:mt-0"
      {...props}
    >
      {children}
    </h3>
  ),
  h3: ({ children, ...props }) => (
    <h4
      className="mb-2 mt-6 text-[15px] font-semibold text-(--md-text-primary) first:mt-2"
      {...props}
    >
      {children}
    </h4>
  ),
  h4: ({ children, ...props }) => (
    <h5
      className="mb-2 mt-4 text-sm font-semibold text-(--md-text-primary)"
      {...props}
    >
      {children}
    </h5>
  ),
  p: ({ children, ...props }) => (
    <p
      className="mb-4 text-[15px] leading-[1.75] text-(--md-text-secondary) last:mb-0 [&+p]:mt-0"
      {...props}
    >
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul
      className="mb-4 list-inside space-y-2.5 pl-1 text-[15px] leading-[1.75] text-(--md-text-secondary) [list-style-type:'\2022\00A0']"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="mb-4 list-decimal space-y-2.5 pl-6 text-[15px] leading-[1.75] text-(--md-text-secondary) marker:text-(--md-marker)"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="pl-1 [&>p]:mb-1.5 [&>p]:last:mb-0" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-(--md-text-primary)" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="text-(--md-text-secondary) italic" {...props}>
      {children}
    </em>
  ),
  code: ({ className, children, ...props }) => {
    const isFenced = Boolean(className?.startsWith("language-"));
    if (isFenced) {
      return (
        <code
          className={`block font-mono text-[13px] leading-relaxed text-(--md-code-text) ${className ?? ""}`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-md bg-(--md-code-inline-bg) px-1.5 py-0.5 font-mono text-[0.8125rem] text-(--md-code-inline-text) ring-1 ring-(--md-code-inline-border)"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      className="mb-4 overflow-x-auto rounded-xl border border-(--md-border) bg-(--md-code-bg) p-4 shadow-inner"
      {...props}
    >
      {children}
    </pre>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-4 rounded-xl border border-(--md-quote-border) bg-linear-to-br from-(--md-quote-from) via-(--md-bg) to-(--md-quote-to) px-4 py-3.5 text-[15px] leading-relaxed text-(--md-text-secondary) shadow-(--app-shadow-sm)"
      {...props}
    >
      {children}
    </blockquote>
  ),
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      className="font-medium text-(--md-link) underline decoration-(--md-link-underline) underline-offset-[3px] transition-colors hover:text-(--md-link-hover)"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  hr: () => (
    <hr className="my-8 border-0 border-t border-(--md-border)" />
  ),
  table: ({ children, ...props }) => (
    <div className="mb-4 w-full overflow-x-auto rounded-xl border border-(--md-border) bg-(--md-bg) shadow-(--app-shadow-sm)">
      <table className="w-full min-w-[min(100%,20rem)] border-collapse text-[14px]" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-(--md-surface)" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th
      className="border-b border-(--md-border) px-3 py-2.5 text-left text-sm font-semibold text-(--md-text-primary)"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border-b border-(--md-border-subtle) px-3 py-2.5 text-(--md-text-secondary)" {...props}>
      {children}
    </td>
  ),
};

export function AiReasoningContent({ text }: { text: string }) {
  const trimmed = text.trim();

  if (!trimmed) {
    return (
      <p className="text-sm text-(--md-text-muted)">
        暂无推理内容
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-(--app-ai-border) bg-(--app-ai-bg) p-5 shadow-(--app-shadow) ring-1 ring-(--app-ai-border)">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {trimmed}
      </ReactMarkdown>
    </div>
  );
}
