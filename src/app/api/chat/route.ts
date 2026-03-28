import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { streamChat, buildAppContextPrompt, DEFAULT_MODEL, type ChatMessage } from "@/lib/ai";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit: 20 chat requests per user per minute
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`chat:${ip}`, 20, 60 * 1000);
  if (rl.limited) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
    });
  }
  const body = await request.json();
  const { messages, model, appId } = body as {
    messages: ChatMessage[];
    model?: string;
    appId?: string;
  };

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Messages array required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get allowed services for the user's org
  let allowedServices: string[] | undefined;
  const session = await getServerSession(authOptions);
  if (session?.user?.organizationId) {
    const orgAllowed = await prisma.orgAllowedService.findMany({
      where: {
        organizationId: session.user.organizationId,
        enabled: true,
      },
    });
    allowedServices = orgAllowed.map((s) => s.serviceType);
  }

  // Build app-context system prompt if appId is provided
  let systemPromptOverride: string | undefined;
  if (appId) {
    const app = await prisma.app.findUnique({
      where: { id: appId },
      include: {
        services: {
          include: {
            service: { select: { name: true, type: true } },
          },
        },
      },
    });
    if (app) {
      systemPromptOverride = buildAppContextPrompt(
        {
          name: app.name,
          template: app.template,
          description: app.description,
          status: app.status,
          port: app.port,
          services: app.services.map((s) => ({
            name: s.service.name,
            type: s.service.type,
          })),
        },
        allowedServices
      );
    }
  }

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start streaming in background
  (async () => {
    try {
      const result = await streamChat(
        messages,
        (chunk) => {
          const data = JSON.stringify({ content: chunk });
          writer.write(encoder.encode(`data: ${data}\n\n`));
        },
        model || DEFAULT_MODEL,
        allowedServices,
        systemPromptOverride
      );
      // Send usage data before closing
      if (result.usage) {
        const usageData = JSON.stringify({
          usage: result.usage,
          model: model || DEFAULT_MODEL,
        });
        writer.write(encoder.encode(`data: ${usageData}\n\n`));
      }
      writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unknown error";
      writer.write(
        encoder.encode(
          `data: ${JSON.stringify({ error: msg })}\n\n`
        )
      );
    } finally {
      writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
