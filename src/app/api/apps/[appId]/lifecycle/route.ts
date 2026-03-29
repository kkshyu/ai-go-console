import { NextRequest, NextResponse } from "next/server";
import os from "node:os";
import path from "node:path";
import fsp from "node:fs/promises";
import crypto from "node:crypto";
import { prisma, getOrgSlug } from "@/lib/db";
import { startDevServer, stopDevServer, getDevServerLogs, getDevServerStatus } from "@/lib/dev-server";
import { startApp, stopApp, restartApp, getAppLogs, getAppDockerStatus, tagImage, startAppFromImage } from "@/lib/k8s/deployment";
import { syncRoutes } from "@/lib/k8s/ingress";
import * as sandbox from "@/lib/k8s/sandbox";
import { getTemplate } from "@/lib/templates";
import { authorizeAppAccess } from "@/lib/api-auth";
import { generateApp } from "@/lib/generator";
import { readFileFromMinIO } from "@/lib/minio-storage";
import { createPreOperationSnapshot } from "@/lib/backup";


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const auth = await authorizeAppAccess(appId);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { action } = body as { action: string; deploymentId?: string };

  const app = auth.app;
  const orgSlug = await getOrgSlug(app.userId);

  try {
    switch (action) {
      case "dev-start": {
        // Start dev server inside Docker container
        // If the pod doesn't exist (e.g. after import or pod eviction), recreate it
        const devStatus = await sandbox.getDevContainerStatus(orgSlug, app.slug);
        if (devStatus === "not_found") {
          // Restore from import session files if available
          const importSession = await prisma.importSession.findFirst({
            where: { appId },
            orderBy: { createdAt: "desc" },
          });

          const files: Array<{ path: string; content: string }> = [];
          if (importSession) {
            const chatFiles = await prisma.chatFile.findMany({
              where: {
                importSessionId: importSession.importSessionId,
                status: { in: ["ready", "uploaded"] },
              },
              select: { storagePath: true, relativePath: true, fileType: true },
            });
            for (const cf of chatFiles) {
              if (!cf.storagePath || !cf.relativePath) continue;
              try {
                const buffer = await readFileFromMinIO(cf.storagePath);
                if (cf.fileType === "image" || cf.fileType === "pdf") continue;
                const text = buffer.toString("utf-8");
                if (!/[\x00-\x08\x0E-\x1F]/.test(text.slice(0, 1000))) {
                  files.push({ path: cf.relativePath, content: text });
                }
              } catch { /* skip unreadable */ }
            }
          }

          await generateApp({
            appId,
            slug: app.slug,
            orgSlug,
            name: app.name,
            description: app.description || undefined,
            template: app.template,
            files,
          });
        }
        const result = await startDevServer(orgSlug, app.slug, app.template);
        // Update app status to developing
        await prisma.app.update({
          where: { id: appId },
          data: { status: "developing" },
        });
        // Ensure Traefik IngressRoute exists for the dev container
        syncRoutes().catch(() => {});
        return NextResponse.json({ success: true, ...result });
      }

      case "dev-stop": {
        await stopDevServer(orgSlug, app.slug);
        return NextResponse.json({ success: true });
      }

      case "publish": {
        // Pre-publish snapshot for disaster recovery
        await createPreOperationSnapshot("publish", appId).catch(() => {});

        await prisma.app.update({
          where: { id: appId },
          data: { status: "building" },
        });

        // Determine next version
        const lastDeployment = await prisma.deployment.findFirst({
          where: { appId },
          orderBy: { version: "desc" },
        });
        const version = (lastDeployment?.version ?? 0) + 1;

        // Create deployment record
        const deployment = await prisma.deployment.create({
          data: {
            appId,
            status: "building",
            version,
            imageTag: `aigo-${orgSlug}-${app.slug}-prod:v${version}`,
          },
        });

        // Export source from dev container to temp directory for production build
        const tmpDir = path.join(os.tmpdir(), `aigo-publish-${crypto.randomUUID()}`);
        try {
          await sandbox.exportSource(orgSlug, app.slug, tmpDir);

          // Copy production Dockerfile from template into build context
          const tmpl = getTemplate(app.template);
          if (tmpl) {
            const dockerfileSrc = path.join(tmpl.directory, "Dockerfile");
            await fsp.copyFile(dockerfileSrc, path.join(tmpDir, "Dockerfile"));
          }

          // Stop existing production deployment before re-deploying
          try {
            await stopApp(orgSlug, app.slug);
          } catch {
            // ignore if not running
          }

          // Build and deploy production container via k8s
          const tmplDef = getTemplate(app.template);
          const internalPort = tmplDef?.internalDevPort || 3000;
          // TODO: resolve service env vars for prod
          const output = await startApp(orgSlug, app.slug, version, internalPort);

          // Tag the image for rollback
          await tagImage(orgSlug, app.slug, version);

          // Update deployment record
          await prisma.deployment.update({
            where: { id: deployment.id },
            data: { status: "running", buildLog: output },
          });

          // Mark previous deployments as stopped
          await prisma.deployment.updateMany({
            where: { appId, id: { not: deployment.id }, status: "running" },
            data: { status: "stopped" },
          });

          await prisma.app.update({
            where: { id: appId },
            data: { status: "running" },
          });

          syncRoutes().catch(() => {});

          return NextResponse.json({ success: true, output, deployment });
        } finally {
          await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        }
      }

      case "rollback": {
        const { deploymentId } = body as { action: string; deploymentId: string };
        if (!deploymentId) {
          return NextResponse.json({ error: "deploymentId is required" }, { status: 400 });
        }

        const targetDeployment = await prisma.deployment.findUnique({
          where: { id: deploymentId },
        });
        if (!targetDeployment || targetDeployment.appId !== appId) {
          return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
        }

        await prisma.app.update({
          where: { id: appId },
          data: { status: "building" },
        });

        // Stop current deployment
        await stopApp(orgSlug, app.slug);

        // Start from the tagged image version
        const output = await startAppFromImage(orgSlug, app.slug, targetDeployment.version);

        // Create a new deployment record for the rollback
        const lastDep = await prisma.deployment.findFirst({
          where: { appId },
          orderBy: { version: "desc" },
        });
        const newVersion = (lastDep?.version ?? 0) + 1;

        const dep = await prisma.deployment.create({
          data: {
            appId,
            status: "running",
            version: newVersion,
            imageTag: targetDeployment.imageTag,
            buildLog: `Rolled back to v${targetDeployment.version}\n${output}`,
          },
        });

        await prisma.deployment.updateMany({
          where: { appId, id: { not: dep.id }, status: "running" },
          data: { status: "stopped" },
        });

        await prisma.app.update({
          where: { id: appId },
          data: { status: "running" },
        });

        syncRoutes().catch(() => {});

        return NextResponse.json({ success: true, output, deployment: dep });
      }

      case "start": {
        const tmplStart = getTemplate(app.template);
        const portStart = tmplStart?.internalDevPort || 3000;
        const lastDeploy = await prisma.deployment.findFirst({
          where: { appId, status: "stopped" },
          orderBy: { version: "desc" },
        });
        const ver = lastDeploy?.version || 1;
        const output = await startApp(orgSlug, app.slug, ver, portStart);
        await prisma.app.update({
          where: { id: appId },
          data: { status: "running" },
        });
        syncRoutes().catch(() => {});
        return NextResponse.json({ success: true, output });
      }

      case "stop": {
        const output = await stopApp(orgSlug, app.slug);
        await prisma.app.update({
          where: { id: appId },
          data: { status: "stopped" },
        });
        return NextResponse.json({ success: true, output });
      }

      case "restart": {
        const output = await restartApp(orgSlug, app.slug);
        await prisma.app.update({
          where: { id: appId },
          data: { status: "running" },
        });
        return NextResponse.json({ success: true, output });
      }

      case "logs": {
        const k8sStatus = await getAppDockerStatus(orgSlug, app.slug);
        if (k8sStatus === "running") {
          const logs = await getAppLogs(orgSlug, app.slug);
          return NextResponse.json({ logs });
        } else {
          const logs = await getDevServerLogs(orgSlug, app.slug);
          return NextResponse.json({ logs: logs.join("\n") });
        }
      }

      case "dev-status": {
        const status = await getDevServerStatus(orgSlug, app.slug);
        return NextResponse.json(status);
      }

      case "dev-logs": {
        const logs = await getDevServerLogs(orgSlug, app.slug);
        return NextResponse.json({ logs: logs.join("\n") });
      }

      case "prod-logs": {
        const logs = await getAppLogs(orgSlug, app.slug);
        return NextResponse.json({ logs });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    // Update app status and mark any "building" deployments as failed
    await Promise.all([
      prisma.app.update({
        where: { id: appId },
        data: { status: "error" },
      }),
      prisma.deployment.updateMany({
        where: { appId, status: "building" },
        data: { status: "failed", buildLog: msg },
      }),
    ]);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
