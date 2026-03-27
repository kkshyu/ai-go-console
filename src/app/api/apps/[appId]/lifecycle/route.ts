import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startDevServer, stopDevServer, getDevServerLogs } from "@/lib/dev-server";
import { startApp, stopApp, restartApp, getAppLogs, getAppDockerStatus } from "@/lib/docker";
import { regenerateCompose } from "@/lib/generator";
import { syncCaddyRoutes } from "@/lib/proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const body = await request.json();
  const { action } = body as { action: string };

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  try {
    switch (action) {
      case "dev-start": {
        // Start dev server for live preview
        if (!app.port) {
          return NextResponse.json({ error: "No port assigned" }, { status: 400 });
        }
        const result = await startDevServer(app.slug, app.template, app.port);
        await prisma.app.update({
          where: { id: appId },
          data: { status: "developing" },
        });
        return NextResponse.json({ success: true, ...result });
      }

      case "dev-stop": {
        await stopDevServer(app.slug);
        await prisma.app.update({
          where: { id: appId },
          data: { status: "stopped" },
        });
        return NextResponse.json({ success: true });
      }

      case "publish": {
        // Build Docker image and start production container
        await prisma.app.update({
          where: { id: appId },
          data: { status: "building" },
        });

        // Stop dev server if running
        await stopDevServer(app.slug);

        // Regenerate docker-compose.yml to pick up latest service bindings
        await regenerateCompose(app.id, app.slug, app.template, app.port!);

        // Build and start Docker container (startApp uses --build)
        const output = await startApp(app.slug);

        await prisma.app.update({
          where: { id: appId },
          data: { status: "running" },
        });

        // Sync Caddy routes
        syncCaddyRoutes().catch(() => {});

        return NextResponse.json({ success: true, output });
      }

      case "start": {
        const output = await startApp(app.slug);
        await prisma.app.update({
          where: { id: appId },
          data: { status: "running" },
        });
        syncCaddyRoutes().catch(() => {});
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
          const logs = getDevServerLogs(app.slug);
          return NextResponse.json({ logs: logs.join("\n") });
        }
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await prisma.app.update({
      where: { id: appId },
      data: { status: "error" },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
