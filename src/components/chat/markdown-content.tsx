"use client";

import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { ChevronRight, Settings2 } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  create_app: "建立應用程式",
  update_app: "更新應用設定",
  modify_files: "修改檔案",
  architect_design: "架構設計方案",
  review_result: "審查結果",
  deploy_ready: "部署設定",
  dispatch: "分派任務",
  dispatch_parallel: "平行分派任務",
  respond: "回覆訊息",
  complete: "流程完成",
};

const LANG_LABELS: Record<string, string> = {
  json: "系統資訊",
  typescript: "程式碼",
  ts: "程式碼",
  javascript: "程式碼",
  js: "程式碼",
  tsx: "程式碼",
  jsx: "程式碼",
  sql: "資料庫查詢",
  prisma: "資料結構",
  html: "頁面結構",
  css: "樣式設定",
  bash: "指令",
  sh: "指令",
  shell: "指令",
};

function getFriendlyLabel(text: string): string {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && parsed.action) {
      const actionLabel = ACTION_LABELS[parsed.action];
      if (actionLabel) {
        const name = parsed.name || parsed.summary || "";
        return name ? `${actionLabel}：${name}` : actionLabel;
      }
    }
  } catch {
    // not valid JSON, fall through
  }
  return "系統資訊";
}

function CollapsibleCodeBlock({ children, label }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const text = typeof children === "string" ? children : String(children ?? "");
  const resolvedLabel = label ?? getFriendlyLabel(text);

  return (
    <div className="rounded border border-current/10 bg-black/5 text-xs">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-muted-foreground hover:bg-black/5 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronRight
          className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <Settings2 className="h-3 w-3 shrink-0 opacity-50" />
        <span>{resolvedLabel}</span>
      </button>
      {open && (
        <pre className="overflow-x-auto border-t border-current/10 p-2">
          <code>{children}</code>
        </pre>
      )}
    </div>
  );
}

const components: Components = {
  pre: ({ children }) => {
    const child = Array.isArray(children) ? children[0] : children;
    if (
      child &&
      typeof child === "object" &&
      "props" in child
    ) {
      const codeProps = child.props as { children?: ReactNode; className?: string };
      const lang = codeProps.className?.replace("language-", "");
      // Hide prd blocks — they are rendered in the side panel
      if (lang === "prd") {
        return null;
      }
      // Collapse all code blocks with a friendly label
      const label = lang ? (LANG_LABELS[lang] || "程式碼") : undefined;
      return <CollapsibleCodeBlock label={label}>{codeProps.children}</CollapsibleCodeBlock>;
    }
    return (
      <CollapsibleCodeBlock>{children}</CollapsibleCodeBlock>
    );
  },
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-black/10 px-1 py-0.5 text-xs">
        {children}
      </code>
    );
  },
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-current/20 px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-current/20 px-2 py-1">{children}</td>
  ),
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
