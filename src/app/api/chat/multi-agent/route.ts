import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  streamChat,
  buildAppContextPrompt,
  DEFAULT_MODEL,
  type ChatMessage,
} from "@/lib/ai";
import {
  routeMessage,
  buildAgentContext,
  createInitialPipelineState,
} from "@/lib/agents/orchestrator";
import type { AgentMessage, PipelineState } from "@/lib/agents/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    messages,
    model,
    appId,
    pipelineId,
    pipelineState: clientPipelineState,
  } = body as {
    messages: ChatMessage[];
    model?: string;
    appId?: string;
    pipelineId?: string;
    pipelineState?: PipelineState;
  };

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Messages array required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get allowed services for the user's org
  let allowedServices: string[] = [];
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
        allowedServices
      );
    }
  }

  // Convert to AgentMessages for routing
  const agentMessages: AgentMessage[] = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
    agentRole: (m as unknown as { agentRole?: string }).agentRole as
      | AgentMessage["agentRole"]
      | undefined,
    stage: (m as unknown as { stage?: string }).stage as
      | AgentMessage["stage"]
      | undefined,
  }));

  // Use client pipeline state, or load from DB, or create new
  let pipelineState: PipelineState | undefined = clientPipelineState;
  if (!pipelineState && pipelineId) {
    const pipeline = await prisma.agentPipeline.findUnique({
      where: { id: pipelineId },
    });
    if (pipeline) {
      pipelineState = {
        status: pipeline.status as PipelineState["status"],
        currentStage: pipeline.currentStage as PipelineState["currentStage"],
        completedStages:
          pipeline.completedStages as PipelineState["completedStages"],
        stages: (pipeline.stageData as PipelineState["stages"]) ||
          createInitialPipelineState().stages,
      };
    }
  }

  // Route to the appropriate agent
  const dispatch = routeMessage(agentMessages, {
    allowedServices,
    appContext,
    pipelineState,
  });

  // Build the system prompt with context from previous agents
  const agentContext = buildAgentContext(agentMessages, dispatch.pipelineState);
  const systemPrompt = dispatch.systemPrompt + agentContext;

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start streaming in background
  (async () => {
    try {
      // Send agent metadata first
      const metaData = JSON.stringify({
        agentRole: dispatch.agentRole,
        stage: dispatch.stage,
        pipelineState: dispatch.pipelineState,
      });
      writer.write(encoder.encode(`data: ${metaData}\n\n`));

      const result = await streamChat(
        messages,
        (chunk) => {
          const data = JSON.stringify({
            content: chunk,
            agentRole: dispatch.agentRole,
          });
          writer.write(encoder.encode(`data: ${data}\n\n`));
        },
        model || DEFAULT_MODEL,
        allowedServices,
        systemPrompt
      );

      // Send usage data
      if (result.usage) {
        const usageData = JSON.stringify({
          usage: result.usage,
          model: model || DEFAULT_MODEL,
        });
        writer.write(encoder.encode(`data: ${usageData}\n\n`));
      }

      // Check if the response advances the pipeline
      const updatedDispatch = routeMessage(
        [
          ...agentMessages,
          {
            role: "assistant",
            content: result.content,
            agentRole: dispatch.agentRole,
            stage: dispatch.stage,
          },
        ],
        { allowedServices, appContext, pipelineState: dispatch.pipelineState }
      );

      // Send updated pipeline state
      const pipelineUpdate = JSON.stringify({
        pipelineState: updatedDispatch.pipelineState,
        nextAgent: updatedDispatch.agentRole,
        nextStage: updatedDispatch.stage,
      });
      writer.write(encoder.encode(`data: ${pipelineUpdate}\n\n`));

      // Persist pipeline state if we have a pipelineId
      if (pipelineId) {
        await prisma.agentPipeline.update({
          where: { id: pipelineId },
          data: {
            status: updatedDispatch.pipelineState.status,
            currentStage: updatedDispatch.pipelineState.currentStage,
            completedStages: updatedDispatch.pipelineState.completedStages,
            stageData: JSON.parse(JSON.stringify(updatedDispatch.pipelineState.stages)),
          },
        });
      }

      writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      writer.write(
        encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
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
