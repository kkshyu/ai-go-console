import { NextRequest, NextResponse } from "next/server";
import os from "node:os";
import path from "node:path";
import fsp from "node:fs/promises";
import crypto from "node:crypto";
import { prisma, getOrgSlug } from "@/lib/db";
import { startDevServer, stopDevServer, getDevServerLogs } from "@/lib/dev-server";
import { startApp, stopApp, restartApp, getAppLogs, getAppDockerStatus, tagImage, startAppFromImage } from "@/lib/docker";
import { regenerateCompose, getAppPath } from "@/lib/generator";
import { syncRoutes } from "@/lib/proxy";
import * as sandbox from "@/lib/docker-sandbox";
import { getTemplate } from "@/lib/templates";


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const body = await request.json();
  const { action } = body as { action: string; deploymentId?: string };

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const orgSlug = await getOrgSlug(app.userId);

  try {
    switch (action) {
      case "dev-start": {
        // Start dev server inside Docker container
        if (!app.port) {
          return NextResponse.json({ error: "No port assigned" }, { status: 400 });
        }
        const result = await startDevServer(orgSlug, app.slug, app.template, app.port);
        return NextResponse.json({ success: true, ...result });
      }

      case "dev-stop": {
        await stopDevServer(orgSlug, app.slug);
        return NextResponse.json({ success: true });
      }

      case "publish": {

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

        // Regenerate docker-compose.yml with latest service bindings
        await regenerateCompose(app.id, app.slug, orgSlug, app.template, app.prodPort!);

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

          // Copy docker-compose.yml from host metadata directory
          const composeSrc = path.join(getAppPath(app.slug), "docker-compose.yml");
          await fsp.copyFile(composeSrc, path.join(tmpDir, "docker-compose.yml"));

          // Stop existing production container before re-deploying to avoid name conflict
          try {
            await stopApp(app.slug);
          } catch {
            // ignore if not running
          }
          // Also force-remove legacy container name (without -prod suffix) and new name
          // to handle migration from old naming convention
          const { execFile: ef } = await import("node:child_process");
          const { promisify: pf } = await import("node:util");
          const efAsync = pf(ef);
          for (const name of [`aigo-${orgSlug}-${app.slug}`, `aigo-${orgSlug}-${app.slug}-prod`]) {
            try { await efAsync("docker", ["rm", "-f", name], { timeout: 10_000 }); } catch { /* ignore */ }
          }

          // Build and start production container from the temp directory
          const { execFile } = await import("node:child_process");
          const { promisify } = await import("node:util");
          const execFileAsync = promisify(execFile);

          const { stdout, stderr } = await execFileAsync(
            "docker",
            ["compose", "-f", path.join(tmpDir, "docker-compose.yml"), "up", "-d", "--build"],
            { timeout: 300_000, cwd: tmpDir }
          );
          const output = stdout + stderr;

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

        // Stop current container
        await stopApp(app.slug);

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
        const output = await startApp(app.slug);
        await prisma.app.update({
          where: { id: appId },
          data: { status: "running" },
        });
        syncRoutes().catch(() => {});
        return NextResponse.json({ success: true, output });
      }

      case "stop": {
        const output = await stopApp(app.slug);
        await prisma.app.update({
          where: { id: appId },
          data: { status: "stopped" },
        });
        return NextResponse.json({ success: true, output });
      }

      case "restart": {
        const output = await restartApp(app.slug);
        await prisma.app.update({
          where: { id: appId },
          data: { status: "running" },
        });
        return NextResponse.json({ success: true, output });
      }

      case "logs": {
        const dockerStatus = await getAppDockerStatus(app.slug);
        if (dockerStatus === "running") {
          const logs = await getAppLogs(app.slug);
          return NextResponse.json({ logs });
        } else {
          const logs = await getDevServerLogs(orgSlug, app.slug);
          return NextResponse.json({ logs: logs.join("\n") });
        }
      }

      case "dev-logs": {
        const logs = await getDevServerLogs(orgSlug, app.slug);
        return NextResponse.json({ logs: logs.join("\n") });
      }

      case "prod-logs": {
        const logs = await getAppLogs(app.slug);
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
