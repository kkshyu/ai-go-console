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

export class ImportOrchestratorActor extends BackgroundActor {
  constructor(id: string) {
    super(id, "import_orchestrator");
  }

  async process(message: BackgroundMessage): Promise<{ success: boolean }> {
    const payload = message.payload as GenerateAndStartPayload;
    const { appId, importSessionId, orgSlug } = payload;

    try {
      // Step 1: Update status to creating
      await this.updateSession(importSessionId, "creating", "正在建立容器...");

      // Step 2: Load app record
      const app = await prisma.app.findUnique({ where: { id: appId } });
      if (!app) throw new Error(`App ${appId} not found`);

      // Step 3: Read user files from MinIO via ChatFile records
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

      const files: Array<{ path: string; content: string }> = [];
      for (const cf of chatFiles) {
        if (!cf.storagePath || !cf.relativePath) continue;

        try {
          const buffer = await readFileFromMinIO(cf.storagePath);
          // For text/code files, use string content; for binary, skip (they go as-is)
          if (cf.fileType === "code" || cf.fileType === "unknown") {
            const text = buffer.toString("utf-8");
            // Strip root folder prefix if present (e.g., "my-project/src/app.ts" → "src/app.ts")
            const path = stripRootFolder(cf.relativePath);
            files.push({ path, content: text });
          } else if (cf.fileType === "image" || cf.fileType === "pdf") {
            // Binary files — skip for now (autostart fix can handle missing assets)
          } else {
            // Try as text
            const text = buffer.toString("utf-8");
            if (!/[\x00-\x08\x0E-\x1F]/.test(text.slice(0, 1000))) {
              const path = stripRootFolder(cf.relativePath);
              files.push({ path, content: text });
            }
          }
        } catch (err) {
          console.warn(`[ImportOrchestrator] Failed to read file ${cf.id}:`, err);
          // Continue with other files — error tolerance
        }
      }

      // Step 4: Generate app with blank template
      await generateApp({
        appId: app.id,
        slug: app.slug,
        orgSlug,
        name: app.name,
        description: app.description || undefined,
        template: "blank",
        port: app.port!,
        prodPort: app.prodPort!,
        files,
      });

      // Step 5: Run autostart loop
      await this.updateSession(importSessionId, "starting", "正在啟動應用程式...");

      const result = await runAutostartLoop(
        app.id,
        orgSlug,
        app.slug,
        app.template,
        app.port!,
        async (event) => {
          // Update progress message for UI polling
          await this.updateSession(
            importSessionId,
            "starting",
            event.message,
          ).catch(() => {});
        },
      );

      // Step 6: Update final status
      if (result.success) {
        await this.updateSession(importSessionId, "completed", "應用程式已成功啟動！");
      } else {
        const errorMsg = result.errors?.join("\n") || "自動啟動失敗";
        await prisma.app.update({
          where: { id: appId },
          data: { status: "error" },
        });
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

      // Update statuses on failure
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
        // Best effort status update
      }

      return { success: false };
    }
  }

  private async updateSession(
    importSessionId: string,
    status: string,
    progressMessage: string,
  ): Promise<void> {
    await prisma.importSession.update({
      where: { importSessionId },
      data: { status, progressMessage },
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
  // If first segment looks like a project root folder (not src, app, etc.)
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
