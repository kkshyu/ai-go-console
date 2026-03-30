/**
 * Import Autostart Module
 *
 * Extracted from the SSE autostart route so it can be reused by both:
 * - The SSE endpoint (for real-time UI updates)
 * - The import orchestrator actor (for background processing)
 */

import { prisma } from "@/lib/db";
import { chat } from "@/lib/ai";
import { getModelForTier } from "@/lib/model-tiers";
import { startDevServer, getDevServerLogs, stopDevServer } from "@/lib/dev-server";
import * as sandbox from "@/lib/k8s/sandbox";

/** Maximum fix attempts before giving up */
const MAX_FIX_ATTEMPTS = 5;
/** Wait time (ms) for dev server to start before checking logs */
const STARTUP_WAIT_MS = 12_000;
/** Max file content to include in fix prompt (4KB) */
const MAX_FIX_FILE_CONTENT = 4 * 1024;

export interface AutostartEvent {
  step: string;
  attempt?: number;
  message: string;
  errors?: string[];
  filesFixed?: string[];
}

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

/** Patterns that indicate successful startup */
const SUCCESS_PATTERNS = [
  /Ready in \d/,
  /started server on/i,
  /Listening on.+:\d+/,
  /Local:\s+http/,
  /compiled.*successfully/i,
  /Accepting connections/i,
  /Serving!/,
];

/** Known noise patterns — always ignored */
const STARTUP_NOISE_PATTERNS = [
  "Compiling",
  "compiled client and server",
  "compiled",
  "waiting",
  "warn  -",
  "DeprecationWarning",
  "ExperimentalWarning",
  "punycode",
  "(node:",
  "FetchError",
  "fetch failed",
  "NEXT_REDIRECT",
  "npm warn",
  "Checking for updates failed",
  "added ",
  " packages in ",
];

/** Error patterns that indicate a real build/runtime error */
const ERROR_PATTERNS = [
  /Error:(?!\s*$)/,
  /ERR!/,
  /Cannot find module/i,
  /Module not found/i,
  /SyntaxError/,
  /TypeError:/,
  /ReferenceError:/,
  /ENOENT/,
  /EACCES/,
  /failed to compile/i,
  /Build error/i,
  /Unhandled Runtime Error/i,
  /Command failed/i,
  /ERESOLVE/,
  /npm ERR/i,
];

function detectErrors(logs: string[]): { errors: string[]; hasSuccessSignal: boolean } {
  const errors: string[] = [];
  let hasSuccessSignal = false;

  for (const line of logs) {
    if (SUCCESS_PATTERNS.some((p) => p.test(line))) {
      hasSuccessSignal = true;
    }
    if (STARTUP_NOISE_PATTERNS.some((p) => line.includes(p))) continue;
    if (ERROR_PATTERNS.some((p) => p.test(line))) {
      errors.push(line);
    }
  }

  return { errors, hasSuccessSignal };
}

function parseFixResponse(content: string): {
  files: Array<{ path: string; content: string }>;
  explanation: string;
} | null {
  const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : content;

  try {
    const parsed = JSON.parse(jsonStr.trim());
    if (!parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) {
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

function extractFilePathsFromErrors(errorText: string, knownFiles: string[]): string[] {
  const found = new Set<string>();

  const pathPattern = /(?:\.\/)?((src|app|pages|components|lib|utils|hooks|styles|public)\/[^\s:'"]+)/g;
  let match;
  while ((match = pathPattern.exec(errorText)) !== null) {
    const filePath = match[1].replace(/:\d+:\d+$/, "").replace(/:\d+$/, "");
    if (knownFiles.includes(filePath)) {
      found.add(filePath);
    }
  }

  for (const knownFile of knownFiles) {
    if (errorText.includes(knownFile) || errorText.includes(`./${knownFile}`)) {
      found.add(knownFile);
    }
  }

  return [...found];
}

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

  parts.push("\n請分析錯誤原因並修復相關檔案，讓應用程式能夠成功啟動。");

  return parts.join("\n");
}

/**
 * Run the autostart loop: start dev server, detect errors, apply AI fixes.
 * Calls onEvent for each step so the caller can stream to UI or log.
 */
export async function runAutostartLoop(
  appId: string,
  orgSlug: string,
  appSlug: string,
  template: string,
  onEvent?: (event: AutostartEvent) => void | Promise<void>,
): Promise<{ success: boolean; errors?: string[] }> {
  const emit = async (event: AutostartEvent) => {
    if (onEvent) await onEvent(event);
  };

  try {
    for (let attempt = 0; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
      // Step 1: Start dev server
      if (attempt === 0) {
        await emit({ step: "starting", attempt, message: "正在啟動開發伺服器..." });
      } else {
        await emit({ step: "restarting", attempt, message: `第 ${attempt} 次修復後重新啟動...` });
      }

      try {
        await startDevServer(orgSlug, appSlug, template);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to start dev server";
        await emit({ step: "error", attempt, message: `啟動失敗: ${msg}` });
      }

      // Step 2: Wait for server to initialize
      await emit({ step: "checking", attempt, message: "等待伺服器啟動..." });
      await new Promise((resolve) => setTimeout(resolve, STARTUP_WAIT_MS));

      // Step 3: Read logs and detect errors
      let logs: string[];
      try {
        logs = await getDevServerLogs(orgSlug, appSlug, 100);
      } catch {
        logs = [];
      }

      const { errors, hasSuccessSignal } = detectErrors(logs);

      // Step 4: Success
      if (errors.length === 0 || hasSuccessSignal) {
        await prisma.app.update({
          where: { id: appId },
          data: { status: "running" },
        });
        await emit({ step: "success", attempt, message: "應用程式已成功啟動！" });
        return { success: true };
      }

      // Step 5: Max attempts reached
      if (attempt >= MAX_FIX_ATTEMPTS) {
        await emit({
          step: "failed",
          attempt,
          message: `經過 ${MAX_FIX_ATTEMPTS} 次嘗試後仍無法啟動`,
          errors: errors.slice(0, 10),
        });
        return { success: false, errors: errors.slice(0, 10) };
      }

      // Step 6: Try to fix errors
      await emit({
        step: "fixing",
        attempt: attempt + 1,
        message: "偵測到錯誤，正在分析並修復...",
        errors: errors.slice(0, 5),
      });

      let fileTree: string[] = [];
      try {
        const tree = await sandbox.listFileTree(orgSlug, appSlug);
        fileTree = tree.filter((e) => !e.isDirectory).map((e) => e.relativePath);
      } catch {
        // Continue without file tree
      }

      const errorText = errors.join("\n");
      const filesToRead = extractFilePathsFromErrors(errorText, fileTree);
      const fileContents: Array<{ path: string; content: string }> = [];

      for (const filePath of filesToRead.slice(0, 10)) {
        try {
          const content = await sandbox.readFile(orgSlug, appSlug, filePath);
          fileContents.push({
            path: filePath,
            content: content.length > MAX_FIX_FILE_CONTENT
              ? content.slice(0, MAX_FIX_FILE_CONTENT) + "\n... (truncated)"
              : content,
          });
        } catch {
          // File might not exist
        }
      }

      if (!filesToRead.includes("package.json")) {
        try {
          const pkgContent = await sandbox.readFile(orgSlug, appSlug, "package.json");
          fileContents.push({ path: "package.json", content: pkgContent });
        } catch {
          // No package.json
        }
      }

      const fixPrompt = buildFixPrompt(errorText, fileContents, fileTree);

      try {
        const model = getModelForTier("developer", "senior");
        const result = await chat(
          [{ role: "user", content: fixPrompt }],
          model,
          FIX_SYSTEM_PROMPT
        );

        const fix = parseFixResponse(result.content);
        if (!fix) {
          await emit({
            step: "fix_failed",
            attempt: attempt + 1,
            message: "AI 無法生成有效的修復方案",
          });
          continue;
        }

        await sandbox.writeFiles(orgSlug, appSlug, fix.files);

        const pkgModified = fix.files.some((f) => f.path === "package.json");
        if (pkgModified) {
          await emit({
            step: "installing",
            attempt: attempt + 1,
            message: "package.json 已修改，將在重啟時重新安裝依賴...",
          });
          try {
            await stopDevServer(orgSlug, appSlug);
          } catch {
            // Ignore stop errors
          }
        }

        await emit({
          step: "fixed",
          attempt: attempt + 1,
          message: fix.explanation || `已修復 ${fix.files.length} 個檔案`,
          filesFixed: fix.files.map((f) => f.path),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Fix generation failed";
        await emit({
          step: "fix_error",
          attempt: attempt + 1,
          message: `修復過程出錯: ${msg}`,
        });
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await emit({ step: "error", message: `自動啟動失敗: ${msg}` });
  }

  return { success: false };
}
