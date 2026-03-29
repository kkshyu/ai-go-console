import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, getOrgSlug } from "@/lib/db";
import { runAutostartLoop, type AutostartEvent } from "@/lib/import-autostart";

/**
 * POST /api/apps/import/autostart
 *
 * SSE endpoint that automatically starts an app's dev server,
 * detects errors, and uses an AI agent to fix them.
 * Thin wrapper around runAutostartLoop.
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

  function sendSSE(data: Record<string, unknown>) {
    const json = JSON.stringify(data);
    return writer.write(encoder.encode(`data: ${json}\n\n`));
  }

  // Run autostart loop in background
  (async () => {
    try {
      await runAutostartLoop(
        app.id,
        orgSlug,
        app.slug,
        app.template,
        app.port!,
        async (event: AutostartEvent) => {
          await sendSSE(event as unknown as Record<string, unknown>);
        },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await sendSSE({ step: "error", message: `自動啟動失敗: ${msg}` });
    } finally {
      await sendSSE({ step: "done" });
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
