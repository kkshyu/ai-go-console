import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, getOrgSlug } from "@/lib/db";
import { chat, getModelForAgent } from "@/lib/ai";
import { startDevServer, getDevServerLogs, stopDevServer } from "@/lib/dev-server";
import * as sandbox from "@/lib/k8s/sandbox";

/** Maximum fix attempts before giving up */
const MAX_FIX_ATTEMPTS = 5;
/** Wait time (ms) for dev server to start before checking logs */
const STARTUP_WAIT_MS = 12_000;
/** Max file content to include in fix prompt (4KB) */
const MAX_FIX_FILE_CONTENT = 4 * 1024;

const FIX_SYSTEM_PROMPT = `你是一個程式碼修復專家。你的任務是根據錯誤訊息和檔案內容，修復程式碼使應用程式能夠成功啟動。

## 規則
1. 只修復導致啟動失敗的錯誤
2. 不要新增不必要的功能
3. 如果缺少依賴，在 package.json 中加入
4. 如果是 TypeScript 錯誤，修復類型問題
5. 如果是 import 錯誤，修正路徑或安裝缺少的模組
6. 如果是環境變數缺失，使用合理的預設值或條件檢查
7. 保持修改最小化

## 輸出格式
只輸出以下 JSON，不要有其他文字：
\`\`\`json
{
  "action": "modify_files",
  "files": [
    { "path": "src/example.ts", "content": "完整的修正後檔案內容" }
  ],
  "explanation": "簡短說明修復了什麼"
}
\`\`\``;

/** Known error patterns that indicate the server hasn't started yet (not real errors) */
const STARTUP_NOISE_PATTERNS = [
  "Compiling",
  "compiled",
  "Ready in",
  "started server",
  "Listening on",
  "Local:",
  "waiting",
];

/** Error patterns that indicate a real build/runtime error */
const ERROR_PATTERNS = [
  /error/i,
  /Error:/,
  /ERR!/,
  /Cannot find module/i,
  /Module not found/i,
  /SyntaxError/,
  /TypeError/,
  /ReferenceError/,
  /ENOENT/,
  /EACCES/,
  /failed to compile/i,
  /Build error/i,
  /Unhandled Runtime Error/i,
  /ExperimentalWarning.*error/i,
];

function detectErrors(logs: string[]): string[] {
  const errors: string[] = [];
  for (const line of logs) {
    // Skip noise
    if (STARTUP_NOISE_PATTERNS.some((p) => line.includes(p))) continue;
    // Check error patterns
    if (ERROR_PATTERNS.some((p) => p.test(line))) {
      errors.push(line);
    }
  }
  return errors;
}

function parseFixResponse(content: string): {
  files: Array<{ path: string; content: string }>;
  explanation: string;
} | null {
  const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : content;

  try {
    const parsed = JSON.parse(jsonStr.trim());
    if (
      !parsed.files ||
      !Array.isArray(parsed.files) ||
      parsed.files.length === 0
    ) {
      return null;
    }
    return {
      files: parsed.files,
      explanation: parsed.explanation || "",
    };
  } catch {
    return null;
  }
}

function sendSSE(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  data: Record<string, unknown>
) {
  const json = JSON.stringify(data);
  return writer.write(encoder.encode(`data: ${json}\n\n`));
}

/**
 * POST /api/apps/import/autostart
 *
 * SSE endpoint that automatically starts an app's dev server,
 * detects errors, and uses an AI agent to fix them.
 * Repeats up to MAX_FIX_ATTEMPTS times.
 *
 * Body: { appId: string }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();
  const { appId } = body as { appId?: string };

  if (!appId) {
    return new Response(JSON.stringify({ error: "appId is required" }), {
      status: 400,
    });
  }

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app || app.userId !== session.user.id) {
    return new Response(JSON.stringify({ error: "App not found" }), {
      status: 404,
    });
  }

  const orgSlug = await getOrgSlug(session.user.id);

  // Create SSE stream
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Run autostart loop in background
  (async () => {
    try {
      for (let attempt = 0; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
        // Step 1: Start dev server
        if (attempt === 0) {
          await sendSSE(writer, encoder, {
            step: "starting",
            attempt,
            message: "正在啟動開發伺服器...",
          });
        } else {
          await sendSSE(writer, encoder, {
            step: "restarting",
            attempt,
            message: `第 ${attempt} 次修復後重新啟動...`,
          });
        }

        try {
          await startDevServer(orgSlug, app.slug, app.template, app.port!);
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Failed to start dev server";
          await sendSSE(writer, encoder, {
            step: "error",
            attempt,
            message: `啟動失敗: ${msg}`,
          });
          // Continue to try fixing
        }

        // Step 2: Wait for server to initialize
        await sendSSE(writer, encoder, {
          step: "checking",
          attempt,
          message: "等待伺服器啟動...",
        });
        await new Promise((resolve) => setTimeout(resolve, STARTUP_WAIT_MS));

        // Step 3: Read logs and detect errors
        let logs: string[];
        try {
          logs = await getDevServerLogs(orgSlug, app.slug, 100);
        } catch {
          logs = [];
        }

        const errors = detectErrors(logs);

        // Step 4: No errors — success!
        if (errors.length === 0) {
          await prisma.app.update({
            where: { id: appId },
            data: { status: "running" },
          });
          await sendSSE(writer, encoder, {
            step: "success",
            attempt,
            message: "應用程式已成功啟動！",
          });
          break;
        }

        // Step 5: Max attempts reached — fail
        if (attempt >= MAX_FIX_ATTEMPTS) {
          await sendSSE(writer, encoder, {
            step: "failed",
            attempt,
            message: `經過 ${MAX_FIX_ATTEMPTS} 次嘗試後仍無法啟動`,
            errors: errors.slice(0, 10),
          });
          break;
        }

        // Step 6: Try to fix errors
        await sendSSE(writer, encoder, {
          step: "fixing",
          attempt: attempt + 1,
          message: "偵測到錯誤，正在分析並修復...",
          errors: errors.slice(0, 5),
        });

        // Read file tree and relevant source files
        let fileTree: string[] = [];
        try {
          const tree = await sandbox.listFileTree(orgSlug, app.slug);
          fileTree = tree
            .filter((e) => !e.isDirectory)
            .map((e) => e.relativePath);
        } catch {
          // Continue without file tree
        }

        // Read files mentioned in errors
        const errorText = errors.join("\n");
        const filesToRead = extractFilePathsFromErrors(errorText, fileTree);
        const fileContents: Array<{ path: string; content: string }> = [];

        for (const filePath of filesToRead.slice(0, 10)) {
          try {
            const content = await sandbox.readFile(orgSlug, app.slug, filePath);
            fileContents.push({
              path: filePath,
              content:
                content.length > MAX_FIX_FILE_CONTENT
                  ? content.slice(0, MAX_FIX_FILE_CONTENT) + "\n... (truncated)"
                  : content,
            });
          } catch {
            // File might not exist
          }
        }

        // Also read package.json if not already included
        if (!filesToRead.includes("package.json")) {
          try {
            const pkgContent = await sandbox.readFile(
              orgSlug,
              app.slug,
              "package.json"
            );
            fileContents.push({ path: "package.json", content: pkgContent });
          } catch {
            // No package.json
          }
        }

        // Build fix prompt
        const fixPrompt = buildFixPrompt(
          errorText,
          fileContents,
          fileTree
        );

        // Call LLM to generate fix
        try {
          const model = getModelForAgent("developer");
          const result = await chat(
            [{ role: "user", content: fixPrompt }],
            model,
            undefined,
            FIX_SYSTEM_PROMPT
          );

          const fix = parseFixResponse(result.content);
          if (!fix) {
            await sendSSE(writer, encoder, {
              step: "fix_failed",
              attempt: attempt + 1,
              message: "AI 無法生成有效的修復方案",
            });
            continue;
          }

          // Apply fix — write files to container
          await sandbox.writeFiles(orgSlug, app.slug, fix.files);

          // Check if package.json was modified — need to reinstall
          const pkgModified = fix.files.some(
            (f) => f.path === "package.json"
          );
          if (pkgModified) {
            await sendSSE(writer, encoder, {
              step: "installing",
              attempt: attempt + 1,
              message: "package.json 已修改，將在重啟時重新安裝依賴...",
            });
            // Stop server — it will reinstall deps on next startDevServer call
            try {
              await stopDevServer(orgSlug, app.slug);
            } catch {
              // Ignore stop errors
            }
          }

          await sendSSE(writer, encoder, {
            step: "fixed",
            attempt: attempt + 1,
            message: fix.explanation || `已修復 ${fix.files.length} 個檔案`,
            filesFixed: fix.files.map((f) => f.path),
          });
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Fix generation failed";
          await sendSSE(writer, encoder, {
            step: "fix_error",
            attempt: attempt + 1,
            message: `修復過程出錯: ${msg}`,
          });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await sendSSE(writer, encoder, {
        step: "error",
        message: `自動啟動失敗: ${msg}`,
      });
    } finally {
      await sendSSE(writer, encoder, { step: "done" });
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Extract file paths mentioned in error messages.
 */
function extractFilePathsFromErrors(
  errorText: string,
  knownFiles: string[]
): string[] {
  const found = new Set<string>();

  // Match common error patterns like "./src/app/page.tsx" or "src/components/Foo.tsx:12:5"
  const pathPattern = /(?:\.\/)?((src|app|pages|components|lib|utils|hooks|styles|public)\/[^\s:'"]+)/g;
  let match;
  while ((match = pathPattern.exec(errorText)) !== null) {
    const filePath = match[1].replace(/:\d+:\d+$/, "").replace(/:\d+$/, "");
    if (knownFiles.includes(filePath)) {
      found.add(filePath);
    }
  }

  // Also try matching against known files mentioned anywhere in the error
  for (const knownFile of knownFiles) {
    if (
      errorText.includes(knownFile) ||
      errorText.includes(`./${knownFile}`)
    ) {
      found.add(knownFile);
    }
  }

  return [...found];
}

/**
 * Build the prompt for the fix agent.
 */
function buildFixPrompt(
  errorLog: string,
  files: Array<{ path: string; content: string }>,
  fileTree: string[]
): string {
  const parts: string[] = [];

  parts.push("## 錯誤訊息\n");
  parts.push("```");
  parts.push(errorLog.slice(0, 5000));
  parts.push("```\n");

  if (files.length > 0) {
    parts.push("## 相關檔案\n");
    for (const file of files) {
      parts.push(`### ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n`);
    }
  }

  if (fileTree.length > 0) {
    parts.push("## 專案檔案結構\n");
    parts.push(fileTree.slice(0, 100).join("\n"));
    if (fileTree.length > 100) {
      parts.push(`\n... 及其他 ${fileTree.length - 100} 個檔案`);
    }
  }

  parts.push(
    "\n請分析錯誤原因並修復相關檔案，讓應用程式能夠成功啟動。"
  );

  return parts.join("\n");
}
