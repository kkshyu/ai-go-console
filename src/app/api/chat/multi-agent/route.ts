import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  streamChat,
  translateForUser,
  buildAppContextPrompt,
  DEFAULT_MODEL,
  OUTPUT_MODEL,
  type ChatMessage,
} from "@/lib/ai";
import {
  routeMessage,
  buildAgentContext,
  createInitialPipelineState,
} from "@/lib/agents/orchestrator";
import type { AgentMessage, PipelineState } from "@/lib/agents/types";

/** Maximum number of auto-chained agent calls per request */
const MAX_CHAIN_DEPTH = 5;

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

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  /** Helper to send an SSE event */
  const sendEvent = (data: unknown) =>
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

  // Start streaming in background with auto-chaining
  (async () => {
    try {
      let currentMessages = [...agentMessages];
      let currentPipelineState = pipelineState;
      let chainDepth = 0;

      while (chainDepth < MAX_CHAIN_DEPTH) {
        chainDepth++;

        // Route to the appropriate agent
        const dispatch = routeMessage(currentMessages, {
          allowedServices,
          appContext,
          pipelineState: currentPipelineState,
        });

        // Build the system prompt with context from previous agents
        const agentContext = buildAgentContext(currentMessages, dispatch.pipelineState);
        const systemPrompt = dispatch.systemPrompt + agentContext;

        // 1. Send agent metadata
        await sendEvent({
          agentRole: dispatch.agentRole,
          stage: dispatch.stage,
          pipelineState: dispatch.pipelineState,
        });

        // 2. Signal that the agent is thinking (frontend shows loader)
        await sendEvent({
          thinking: true,
          agentRole: dispatch.agentRole,
        });

        // 3. Accumulate agent output silently (no streaming to user)
        const chatMessages: ChatMessage[] = currentMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const result = await streamChat(
          chatMessages,
          () => {}, // no-op: don't stream raw chunks to user
          model || DEFAULT_MODEL,
          allowedServices,
          systemPrompt
        );

        // 4. Send raw generation usage
        if (result.usage) {
          await sendEvent({
            usage: result.usage,
            model: model || DEFAULT_MODEL,
          });
        }

        // 5. Translate agent output for user display
        await sendEvent({
          translating: true,
          agentRole: dispatch.agentRole,
        });

        const translated = await translateForUser(
          result.content,
          dispatch.agentRole,
        );

        // 6. Send translated content as a single chunk
        const displayContent = translated.content || result.content;
        if (displayContent) {
          await sendEvent({
            content: displayContent,
            agentRole: dispatch.agentRole,
          });
        }

        // 7. Send translation usage
        if (translated.usage) {
          await sendEvent({
            usage: translated.usage,
            model: OUTPUT_MODEL,
          });
        }

        // 8. Check if the response advances the pipeline
        const messagesWithResponse: AgentMessage[] = [
          ...currentMessages,
          {
            role: "assistant",
            content: result.content, // raw content for action parsing
            agentRole: dispatch.agentRole,
            stage: dispatch.stage,
          },
        ];

        const updatedDispatch = routeMessage(messagesWithResponse, {
          allowedServices,
          appContext,
          pipelineState: dispatch.pipelineState,
        });

        // 9. Send pipeline state update
        await sendEvent({
          pipelineState: updatedDispatch.pipelineState,
          nextAgent: updatedDispatch.agentRole,
          nextStage: updatedDispatch.stage,
        });

        // Check if the pipeline advanced to a new stage
        const stageAdvanced =
          updatedDispatch.pipelineState.currentStage !== dispatch.pipelineState.currentStage;

        if (stageAdvanced && updatedDispatch.pipelineState.status !== "completed") {
          // 10. Signal agent completion with raw content for action parsing
          await sendEvent({
            agentComplete: true,
            agentRole: dispatch.agentRole,
            rawContent: result.content,
          });

          // Update state for next iteration
          currentMessages = messagesWithResponse;
          currentPipelineState = updatedDispatch.pipelineState;
        } else {
          // Pipeline didn't advance or completed — send raw content for action parsing and stop
          await sendEvent({
            agentComplete: true,
            agentRole: dispatch.agentRole,
            rawContent: result.content,
          });
          currentPipelineState = updatedDispatch.pipelineState;
          break;
        }
      }

      // Persist pipeline state if we have a pipelineId
      if (pipelineId && currentPipelineState) {
        await prisma.agentPipeline.update({
          where: { id: pipelineId },
          data: {
            status: currentPipelineState.status,
            currentStage: currentPipelineState.currentStage,
            completedStages: currentPipelineState.completedStages,
            stageData: JSON.parse(JSON.stringify(currentPipelineState.stages)),
          },
        });
      }

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
