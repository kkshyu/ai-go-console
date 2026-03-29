import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_MODEL, type ChatMessage } from "@/lib/ai";
import type { OrchestrationState } from "@/lib/agents/types";
import { ActorSystem } from "@/lib/actors/actor-system";
import { PMActor, type PMActorConfig } from "@/lib/actors/pm-actor";
import { createSpecialistActor } from "@/lib/actors/specialist-actors";
import { generateTraceId } from "@/lib/actors/logger";
import { actorSystemRegistry } from "@/lib/actors/registry";
import {
  resolveMultiAgentContext,
  saveArtifact,
  probeAndEnrichServices,
} from "@/lib/services/multi-agent-service";
import type { BackgroundActorSystem } from "@/lib/actors/background-system";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const {
    messages,
    model,
    appId,
    conversationId: clientConversationId,
    orchestrationState: clientState,
  } = body as {
    messages: ChatMessage[];
    model?: string;
    appId?: string;
    conversationId?: string;
    orchestrationState?: OrchestrationState;
  };

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Messages array required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Read locale from cookie
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value || "zh-TW";

  // Get session for user identity
  const session = await getServerSession(authOptions);

  // Resolve all DB dependencies via service layer
  const ctx = await resolveMultiAgentContext({
    messages,
    model,
    appId,
    conversationId: clientConversationId,
    locale,
    userId: session?.user?.id,
    userRole: session?.user?.role,
    organizationId: session?.user?.organizationId,
  });

  // Load orchestration state from client
  const orchState: OrchestrationState | undefined = clientState;

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (data: unknown) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Stream may have closed
    }
  };

  // Bind saveArtifact to this conversation
  const saveArtifactForConversation = (
    agentRole: Parameters<typeof saveArtifact>[1],
    content: string,
    actorId?: string,
    taskId?: string,
  ) =>
    saveArtifact(ctx.conversationId, agentRole, content, {
      actorId,
      taskId,
      appId: ctx.appId,
    });

  // Start actor system in background
  (async () => {
    let bgSystem: BackgroundActorSystem | undefined;
    const traceId = generateTraceId();
    try {
      // 0a. Probe service instances for connectivity, keep only working ones
      if (ctx.serviceInstances.length > 0) {
        const enriched = await probeAndEnrichServices(
          ctx.serviceInstances,
          session?.user?.organizationId,
          sendEvent,
        );
        ctx.serviceInstances = enriched.filter((s) => s.status === "ok");
      }

      // 0b. Ensure background actor system is initialized
      try {
        const { ensureBackgroundSystem } = await import(
          "@/lib/actors/background-system"
        );
        bgSystem = await ensureBackgroundSystem();
      } catch (err) {
        console.warn(
          "[multi-agent] Background system init failed (RAG will be unavailable):",
          err,
        );
      }

      // 1. Create actor system with supervisor strategy and trace ID
      const system = new ActorSystem(sendEvent, undefined, traceId);

      // Register with global registry for monitoring
      actorSystemRegistry.register({
        id: traceId,
        system,
        userId: session?.user?.id,
        appId: ctx.appId,
        conversationId: ctx.conversationId,
        startedAt: Date.now(),
        model: ctx.model || DEFAULT_MODEL,
      });

      // 2. Set actor factory for restarts
      system.setActorFactory((role, index) =>
        createSpecialistActor(role, index, {
          model: ctx.model || DEFAULT_MODEL,
          serviceInstances: ctx.serviceInstances,
          appContext: ctx.appContext,
          sendEvent,
          locale: ctx.locale,
          conversationId: ctx.conversationId,
          backgroundSystem: bgSystem,
        }),
      );

      // 3. Create and spawn PM actor
      const pmConfig: PMActorConfig = {
        model: ctx.model || DEFAULT_MODEL,
        serviceInstances: ctx.serviceInstances,
        appContext: ctx.appContext,
        artifactContext: ctx.artifactContext,
        fileContext: ctx.fileContext,
        sendEvent,
        saveArtifact: saveArtifactForConversation,
        system,
        pmPrompt: ctx.pmPrompt,
        locale: ctx.locale,
        appSlug: ctx.appSlug,
        appId: ctx.appId,
        userId: ctx.userId,
        orgSlug: ctx.appOrgSlug,
        conversationId: ctx.conversationId,
        backgroundSystem: bgSystem,
      };

      const pmActor = new PMActor(pmConfig, orchState);
      await system.spawn(pmActor);

      // 4. Start heartbeat monitoring
      system.startHeartbeat();

      // 5. Send initial user message to PM
      const { createMessage } = await import("@/lib/actors/types");
      const initialMsg = createMessage("task", "user", pmActor.id, {
        task: "Process user request",
        context: ctx.artifactContext,
        fileContext: ctx.fileContext,
        messages: ctx.agentMessages.map((m) => ({
          role: m.role,
          content: m.content,
          agentRole: m.agentRole,
          fileIds: m.fileIds,
        })),
      });
      system.send(initialMsg);

      // 6. Wait for completion
      await system.waitForCompletion();

      // 7. Cleanup
      system.stopHeartbeat();
      system.stopAll();

      // Send conversationId to client
      await sendEvent({ conversationId: ctx.conversationId });

      await sendEvent("[DONE]");
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await sendEvent({ error: msg });
    } finally {
      // Unregister from monitoring registry
      actorSystemRegistry.unregister(traceId);
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
