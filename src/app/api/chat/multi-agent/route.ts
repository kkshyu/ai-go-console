import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildAppContextPrompt,
  DEFAULT_MODEL,
  type ChatMessage,
} from "@/lib/ai";
import { buildFileTreeContext } from "@/lib/file-context";
import {
  createInitialOrchestrationState,
} from "@/lib/agents/orchestrator";
import {
  buildPMPrompt,
  buildAppDevPMPrompt,
} from "@/lib/agents/prompts";
import type { AgentRole, OrchestrationState } from "@/lib/agents/types";
import { ActorSystem } from "@/lib/actors/actor-system";
import { PMActor, type PMActorConfig } from "@/lib/actors/pm-actor";
import { createSpecialistActor } from "@/lib/actors/specialist-actors";
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
async function loadArtifactContext(pipelineId: string): Promise<string> {
  const artifacts = await prisma.agentArtifact.findMany({
    where: { pipelineId },
    orderBy: { createdAt: "asc" },
    select: { agentRole: true, type: true, content: true },
  });

  if (artifacts.length === 0) return "";

  const parts = artifacts.map(
    (a) => `[${a.agentRole.toUpperCase()} ${a.type}]: ${JSON.stringify(a.content)}`
  );

  return `\n\nArtifacts from this pipeline:\n${parts.join("\n")}`;
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
      const fileContext = await buildFileTreeContext(app.slug);
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

  // Load persisted artifacts for context
  const artifactContext = pipelineId
    ? await loadArtifactContext(pipelineId)
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

    await prisma.agentArtifact.create({
      data: {
        pipelineId,
        agentRole,
        type,
        content: jsonContent as object,
        ...(actorId && { actorId }),
        ...(taskId && { taskId }),
      },
    });
  };

  // Start actor system in background
  (async () => {
    try {
      // 1. Create actor system with supervisor strategy
      const system = new ActorSystem(sendEvent);

      // 2. Set actor factory for restarts
      system.setActorFactory((role, index) =>
        createSpecialistActor(role, index, {
          model: model || DEFAULT_MODEL,
          allowedServices,
          serviceInstances,
          appContext,
          sendEvent,
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
