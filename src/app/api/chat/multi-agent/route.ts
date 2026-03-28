import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, getOrgSlug } from "@/lib/db";
import {
  buildAppContextPrompt,
  DEFAULT_MODEL,
  type ChatMessage,
} from "@/lib/ai";
import { buildFileTreeContext } from "@/lib/file-context";
import {
  buildPMPrompt,
  buildAppDevPMPrompt,
} from "@/lib/agents/prompts";
import type { AgentRole, OrchestrationState } from "@/lib/agents/types";
import { ActorSystem } from "@/lib/actors/actor-system";
import { PMActor, type PMActorConfig } from "@/lib/actors/pm-actor";
import { createSpecialistActor } from "@/lib/actors/specialist-actors";
import { generateTraceId } from "@/lib/actors/logger";
import type { AgentMessage } from "@/lib/agents/types";

/**
 * Map agent action types to artifact types for persistence.
 */
function getArtifactType(content: string): string | null {
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    const actionMap: Record<string, string> = {
      pm_spec: "spec",
      pm_analysis: "spec",
      architect_design: "design",
      create_app: "implementation",
      update_app: "implementation",
      modify_files: "implementation",
      review_result: "review",
      deploy_ready: "deployment",
      dispatch: "task",
      dispatch_parallel: "task",
      respond: null as unknown as string,
      complete: null as unknown as string,
    };
    return actionMap[parsed.action] ?? null;
  } catch {
    return null;
  }
}

/**
 * Extract the JSON content from an agent's response for artifact storage.
 */
function extractJsonContent(content: string): unknown | null {
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[1]);
  } catch {
    return null;
  }
}

/**
 * Load persisted artifacts for a pipeline and format as minimal context.
 */
/**
 * Load artifact context using RAG (vector similarity search) when available,
 * falling back to full concatenation with truncation.
 */
async function loadArtifactContext(
  pipelineId: string,
  queryText?: string,
  maxChars: number = 8000,
): Promise<string> {
  // Try RAG approach if query text is provided
  if (queryText) {
    try {
      const { backgroundSystem } = await import("@/lib/actors/background-system");
      if (backgroundSystem.initialized) {
        const result = await backgroundSystem.request<{
          context: string;
          chunks: Array<{ content: string; similarity: number; agentRole: string }>;
        }>(
          "retrieval",
          "retrieve_request",
          { pipelineId, query: queryText, maxChars },
          10_000, // 10s timeout
        );

        if (result.context && result.chunks.length > 0) {
          return result.context;
        }
      }
    } catch (err) {
      console.warn(`[loadArtifactContext] RAG failed, falling back: ${err}`);
    }
  }

  // Fallback: original concatenation approach with truncation
  const artifacts = await prisma.agentArtifact.findMany({
    where: { pipelineId },
    orderBy: { createdAt: "asc" },
    select: { agentRole: true, type: true, content: true },
  });

  if (artifacts.length === 0) return "";

  let context = "\n\nArtifacts from this pipeline:\n";
  let charCount = context.length;

  for (const a of artifacts) {
    const entry = `[${a.agentRole.toUpperCase()} ${a.type}]: ${JSON.stringify(a.content)}\n`;
    if (charCount + entry.length > maxChars) break;
    context += entry;
    charCount += entry.length;
  }

  return context;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    messages,
    model,
    appId,
    pipelineId,
    orchestrationState: clientState,
  } = body as {
    messages: ChatMessage[];
    model?: string;
    appId?: string;
    pipelineId?: string;
    orchestrationState?: OrchestrationState;
  };

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Messages array required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Read locale from cookie for agent translation output
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value || "zh-TW";

  // Get allowed services and actual service instances for the user's org
  let allowedServices: string[] = [];
  let serviceInstances: Array<{ id: string; name: string; type: string }> = [];
  const session = await getServerSession(authOptions);
  if (session?.user?.organizationId) {
    const orgAllowed = await prisma.orgAllowedService.findMany({
      where: {
        organizationId: session.user.organizationId,
        enabled: true,
      },
    });
    allowedServices = orgAllowed.map((s) => s.serviceType);

    if (session.user.role === "admin") {
      const services = await prisma.service.findMany({
        where: { organizationId: session.user.organizationId },
        select: { id: true, name: true, type: true },
      });
      serviceInstances = services.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
      }));
    } else {
      const allowed = await prisma.userAllowedServiceInstance.findMany({
        where: { userId: session.user.id },
        include: {
          service: { select: { id: true, name: true, type: true } },
        },
      });
      serviceInstances = allowed.map((a) => ({
        id: a.service.id,
        name: a.service.name,
        type: a.service.type,
      }));
    }
  }

  // Build app context if working on existing app
  let appContext: string | undefined;
  let appSlug: string | undefined;
  let appOrgSlug: string | undefined;
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
      appSlug = app.slug;
      appOrgSlug = await getOrgSlug(app.userId);
      const orgSlug = appOrgSlug;
      const fileContext = await buildFileTreeContext(orgSlug, app.slug);
      appContext = buildAppContextPrompt(
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
        allowedServices,
        fileContext
      );
    }
  }

  // Convert to AgentMessages
  const agentMessages: AgentMessage[] = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
    agentRole: (m as unknown as { agentRole?: string }).agentRole as
      | AgentMessage["agentRole"]
      | undefined,
  }));

  // Load orchestration state
  let orchState: OrchestrationState | undefined = clientState;
  if (!orchState && pipelineId) {
    const pipeline = await prisma.agentPipeline.findUnique({
      where: { id: pipelineId },
    });
    if (pipeline) {
      orchState = {
        status: pipeline.status as OrchestrationState["status"],
        currentAgent: (pipeline.currentAgent as OrchestrationState["currentAgent"]) || null,
        tasks: (pipeline.tasks as unknown as OrchestrationState["tasks"]) || [],
        parallelGroups: (pipeline.parallelGroups as unknown as OrchestrationState["parallelGroups"]) || [],
        activeActors: [],
      };
    }
  }

  // Load persisted artifacts for context (use last user message as RAG query)
  const lastUserMessage = messages.filter((m) => m.role === "user").pop()?.content || "";
  const artifactContext = pipelineId
    ? await loadArtifactContext(pipelineId, lastUserMessage)
    : "";

  // Build PM prompt
  const pmPrompt = appContext
    ? buildAppDevPMPrompt(appContext)
    : buildPMPrompt(allowedServices);

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

  /**
   * Save an agent's structured output as an artifact.
   */
  const saveArtifact = async (
    agentRole: AgentRole,
    content: string,
    actorId?: string,
    taskId?: string
  ) => {
    if (!pipelineId) return;
    const type = getArtifactType(content);
    if (!type) return;
    const jsonContent = extractJsonContent(content);
    if (!jsonContent) return;

    const artifact = await prisma.agentArtifact.create({
      data: {
        pipelineId,
        agentRole,
        type,
        content: jsonContent as object,
        ...(actorId && { actorId }),
        ...(taskId && { taskId }),
      },
    });

    // Fire-and-forget: generate embeddings for this artifact in the background
    try {
      const { backgroundSystem } = await import("@/lib/actors/background-system");
      if (backgroundSystem.initialized) {
        backgroundSystem.fireAndForget("embedding", "embed_request", {
          sourceType: "artifact",
          sourceId: artifact.id,
          pipelineId,
          agentRole,
          content,
        });
      }
    } catch {
      // Embedding is optional — don't fail the save
    }
  };

  // Start actor system in background
  (async () => {
    try {
      // 0. Ensure background actor system is initialized (Embedding, Retrieval, Summarizer)
      try {
        const { ensureBackgroundSystem } = await import("@/lib/actors/background-system");
        await ensureBackgroundSystem();
      } catch (err) {
        console.warn("[multi-agent] Background system init failed (RAG will be unavailable):", err);
      }

      // 1. Create actor system with supervisor strategy and trace ID
      const traceId = generateTraceId();
      const system = new ActorSystem(sendEvent, undefined, traceId);

      // 2. Set actor factory for restarts
      system.setActorFactory((role, index) =>
        createSpecialistActor(role, index, {
          model: model || DEFAULT_MODEL,
          allowedServices,
          serviceInstances,
          appContext,
          sendEvent,
          locale,
        })
      );

      // 3. Create and spawn PM actor
      const pmConfig: PMActorConfig = {
        model: model || DEFAULT_MODEL,
        allowedServices,
        serviceInstances,
        appContext,
        artifactContext,
        sendEvent,
        saveArtifact,
        system,
        pmPrompt,
        locale,
        appSlug,
        appId,
        userId: session?.user?.id,
        orgSlug: appOrgSlug,
      };

      const pmActor = new PMActor(pmConfig, orchState);
      await system.spawn(pmActor);

      // 4. Start heartbeat monitoring
      system.startHeartbeat();

      // 5. Send initial user message to PM
      const { createMessage } = await import("@/lib/actors/types");
      const initialMsg = createMessage("task", "user", pmActor.id, {
        task: "Process user request",
        context: artifactContext,
        messages: agentMessages.map((m) => ({
          role: m.role,
          content: m.content,
          agentRole: m.agentRole,
        })),
      });
      system.send(initialMsg);

      // 6. Wait for completion
      await system.waitForCompletion();

      // 7. Cleanup
      system.stopHeartbeat();

      // 8. Persist final state
      const finalState = system.getFinalState();
      if (pipelineId && finalState) {
        await prisma.agentPipeline.update({
          where: { id: pipelineId },
          data: {
            status: finalState.status,
            currentAgent: finalState.currentAgent || "pm",
            completedAgents: finalState.tasks
              .filter((t) => t.status === "completed")
              .map((t) => t.agentRole),
            tasks: JSON.parse(JSON.stringify(finalState.tasks)),
            parallelGroups: finalState.parallelGroups
              ? JSON.parse(JSON.stringify(finalState.parallelGroups))
              : undefined,
          },
        });
      }

      system.stopAll();

      await sendEvent("[DONE]");
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await sendEvent({ error: msg });
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
