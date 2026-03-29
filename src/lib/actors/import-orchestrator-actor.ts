/**
 * Import Orchestrator Background Actor
 *
 * Runs the full import pipeline in the background after user confirms:
 * 1. Read uploaded files from MinIO
 * 2. Generate app with blank template
 * 3. Run autostart loop with AI-powered error fixing
 * 4. Update App and ImportSession status
 */

import { BackgroundActor } from "./background-actor";
import type { BackgroundMessage } from "./types";
import { prisma } from "../db";
import { generateApp } from "../generator";
import { runAutostartLoop } from "../import-autostart";
import { readFileFromMinIO } from "../minio-storage";

interface GenerateAndStartPayload {
  appId: string;
  importSessionId: string;
  orgSlug: string;
}

/** Structured progress detail stored as JSON in progressDetail column */
export interface ImportProgressDetail {
  /** Ordered list of pipeline steps with completion status */
  steps: ImportStep[];
  /** Currently processing file info */
  currentFile?: string;
  /** Files processed so far / total */
  filesProcessed?: number;
  filesTotal?: number;
  /** Autostart attempt info */
  autostartAttempt?: number;
  autostartMaxAttempts?: number;
  /** Errors encountered during autostart */
  autostartErrors?: string[];
  /** Files fixed in current attempt */
  filesFixed?: string[];
  /** AI fix explanation */
  fixExplanation?: string;
}

export interface ImportStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  detail?: string;
  startedAt?: string;
  completedAt?: string;
}

const STEP_DEFS: Array<{ id: string; label: string }> = [
  { id: "read_files", label: "讀取匯入檔案" },
  { id: "create_container", label: "建立應用容器" },
  { id: "write_files", label: "寫入檔案至容器" },
  { id: "start_server", label: "啟動開發伺服器" },
  { id: "health_check", label: "檢查應用狀態" },
];

function buildInitialSteps(): ImportStep[] {
  return STEP_DEFS.map((d) => ({ id: d.id, label: d.label, status: "pending" as const }));
}

export class ImportOrchestratorActor extends BackgroundActor {
  private progressDetail: ImportProgressDetail = { steps: [] };

  constructor(id: string) {
    super(id, "import_orchestrator");
  }

  async process(message: BackgroundMessage): Promise<{ success: boolean }> {
    const payload = message.payload as GenerateAndStartPayload;
    const { appId, importSessionId, orgSlug } = payload;

    this.progressDetail = { steps: buildInitialSteps() };

    try {
      // Step 1: Read files from MinIO
      await this.markStep(importSessionId, "read_files", "running", "正在從儲存空間讀取檔案...");
      await this.updateSession(importSessionId, "creating", "正在讀取匯入檔案...");

      const app = await prisma.app.findUnique({ where: { id: appId } });
      if (!app) throw new Error(`App ${appId} not found`);

      const chatFiles = await prisma.chatFile.findMany({
        where: {
          importSessionId,
          status: { in: ["ready", "uploaded"] },
        },
        select: {
          id: true,
          storagePath: true,
          relativePath: true,
          fileName: true,
          fileType: true,
          extractedText: true,
        },
      });

      this.progressDetail.filesTotal = chatFiles.length;
      this.progressDetail.filesProcessed = 0;
      await this.saveProgress(importSessionId);

      const files: Array<{ path: string; content: string }> = [];
      for (const cf of chatFiles) {
        if (!cf.storagePath || !cf.relativePath) {
          this.progressDetail.filesProcessed = (this.progressDetail.filesProcessed ?? 0) + 1;
          continue;
        }

        this.progressDetail.currentFile = cf.relativePath;
        // Batch progress updates — only save every 10 files or on the last file
        const processed: number = (this.progressDetail.filesProcessed ?? 0) + 1;
        if (processed % 10 === 0 || processed === chatFiles.length) {
          await this.saveProgress(importSessionId);
        }

        try {
          const buffer = await readFileFromMinIO(cf.storagePath);
          if (cf.fileType === "code" || cf.fileType === "unknown") {
            const text = buffer.toString("utf-8");
            const path = stripRootFolder(cf.relativePath);
            files.push({ path, content: text });
          } else if (cf.fileType === "image" || cf.fileType === "pdf") {
            // Binary files — skip for now
          } else {
            const text = buffer.toString("utf-8");
            if (!/[\x00-\x08\x0E-\x1F]/.test(text.slice(0, 1000))) {
              const path = stripRootFolder(cf.relativePath);
              files.push({ path, content: text });
            }
          }
        } catch (err) {
          console.warn(`[ImportOrchestrator] Failed to read file ${cf.id}:`, err);
        }

        this.progressDetail.filesProcessed = processed;
      }

      this.progressDetail.currentFile = undefined;
      await this.markStep(importSessionId, "read_files", "completed",
        `已讀取 ${files.length} 個檔案（共 ${chatFiles.length} 個）`);

      // Step 2: Create container
      await this.markStep(importSessionId, "create_container", "running", "正在建立應用容器...");
      await this.updateSession(importSessionId, "creating", "正在建立容器並寫入檔案...");

      await generateApp({
        appId: app.id,
        slug: app.slug,
        orgSlug,
        name: app.name,
        description: app.description || undefined,
        template: "blank",
        files,
      });

      await this.markStep(importSessionId, "create_container", "completed", "容器建立完成");
      await this.markStep(importSessionId, "write_files", "completed",
        `已寫入 ${files.length} 個檔案至容器`);

      // Step 3: Start dev server
      await this.markStep(importSessionId, "start_server", "running", "正在啟動開發伺服器...");
      await this.updateSession(importSessionId, "starting", "正在啟動應用程式...");

      this.progressDetail.autostartAttempt = 0;
      this.progressDetail.autostartMaxAttempts = 5;
      await this.saveProgress(importSessionId);

      const result = await runAutostartLoop(
        app.id,
        orgSlug,
        app.slug,
        app.template,
        async (event) => {
          // Map autostart events to detailed progress
          if (event.attempt !== undefined) {
            this.progressDetail.autostartAttempt = event.attempt;
          }
          if (event.errors) {
            this.progressDetail.autostartErrors = event.errors;
          }
          if (event.filesFixed) {
            this.progressDetail.filesFixed = event.filesFixed;
          }

          switch (event.step) {
            case "starting":
            case "restarting":
              await this.markStep(importSessionId, "start_server", "running", event.message);
              break;
            case "checking":
              await this.markStep(importSessionId, "health_check", "running", event.message);
              break;
            case "fixing":
              this.progressDetail.fixExplanation = undefined;
              this.progressDetail.filesFixed = undefined;
              await this.markStep(importSessionId, "health_check", "running",
                `第 ${event.attempt ?? 1} 次修復嘗試：偵測到錯誤，AI 正在分析...`);
              break;
            case "fixed":
              this.progressDetail.fixExplanation = event.message;
              await this.markStep(importSessionId, "health_check", "running",
                `第 ${this.progressDetail.autostartAttempt ?? 1} 次修復完成：${event.message}`);
              break;
            case "fix_failed":
            case "fix_error":
              await this.markStep(importSessionId, "health_check", "running", event.message);
              break;
            case "installing":
              await this.markStep(importSessionId, "health_check", "running", event.message);
              break;
            case "success":
              await this.markStep(importSessionId, "start_server", "completed", "開發伺服器已啟動");
              await this.markStep(importSessionId, "health_check", "completed", "應用程式運行正常");
              break;
            case "failed":
            case "error":
              await this.markStep(importSessionId, "health_check", "failed", event.message);
              break;
            default:
              break;
          }

          await this.updateSession(importSessionId, "starting", event.message);
        },
      );

      // Step 4: Final status
      if (result.success) {
        await this.updateSession(importSessionId, "completed", "應用程式已成功啟動！");
      } else {
        const errorMsg = result.errors?.join("\n") || "自動啟動失敗";
        await prisma.app.update({
          where: { id: appId },
          data: { status: "error" },
        });
        await this.markStep(importSessionId, "start_server", "failed", "啟動失敗");
        await this.markStep(importSessionId, "health_check", "failed", errorMsg);
        this.progressDetail.autostartErrors = result.errors;
        await this.saveProgress(importSessionId);
        await this.updateSession(importSessionId, "failed", errorMsg);
        await prisma.importSession.update({
          where: { importSessionId },
          data: { errorMessage: errorMsg },
        });
      }

      return { success: result.success };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[ImportOrchestrator] Failed for app ${appId}:`, errorMsg);

      // Mark current running step as failed
      const runningStep = this.progressDetail.steps.find((s) => s.status === "running");
      if (runningStep) {
        runningStep.status = "failed";
        runningStep.detail = errorMsg;
        runningStep.completedAt = new Date().toISOString();
      }
      await this.saveProgress(importSessionId).catch(() => {});

      try {
        await prisma.app.update({
          where: { id: appId },
          data: { status: "error" },
        });
        await prisma.importSession.update({
          where: { importSessionId },
          data: {
            status: "failed",
            errorMessage: errorMsg,
            progressMessage: `匯入失敗: ${errorMsg}`,
          },
        });
      } catch {
        // Best effort
      }

      return { success: false };
    }
  }

  /** Mark a step's status and save progress to DB */
  private async markStep(
    importSessionId: string,
    stepId: string,
    status: ImportStep["status"],
    detail?: string,
  ): Promise<void> {
    const step = this.progressDetail.steps.find((s) => s.id === stepId);
    if (step) {
      step.status = status;
      if (detail) step.detail = detail;
      if (status === "running" && !step.startedAt) {
        step.startedAt = new Date().toISOString();
      }
      if (status === "completed" || status === "failed") {
        step.completedAt = new Date().toISOString();
      }
    }
    await this.saveProgress(importSessionId);
  }

  /** Persist structured progress to DB */
  private async saveProgress(importSessionId: string): Promise<void> {
    await prisma.importSession.update({
      where: { importSessionId },
      data: { progressDetail: JSON.stringify(this.progressDetail) },
    }).catch(() => {});
  }

  private async updateSession(
    importSessionId: string,
    status: string,
    progressMessage: string,
  ): Promise<void> {
    await prisma.importSession.update({
      where: { importSessionId },
      data: { status, progressMessage, progressDetail: JSON.stringify(this.progressDetail) },
    });
  }
}

/**
 * Strip the root folder prefix from a relative path.
 * e.g., "my-project/src/app.ts" → "src/app.ts"
 * If path has no folder prefix, returns as-is.
 */
function stripRootFolder(relativePath: string): string {
  const parts = relativePath.split("/");
  if (parts.length > 1) {
    const first = parts[0];
    const commonDirs = new Set([
      "src", "app", "pages", "components", "lib", "utils", "public",
      "styles", "hooks", "prisma", "scripts", "test", "tests", "e2e",
      ".github", ".vscode", "config", "api", "server", "client",
    ]);
    if (!commonDirs.has(first) && !first.startsWith(".")) {
      return parts.slice(1).join("/");
    }
  }
  return relativePath;
}
