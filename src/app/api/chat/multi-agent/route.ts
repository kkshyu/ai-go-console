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
  parsePMAction,
  parseAgentResult,
  stateForAgentComplete,
  stateForComplete,
  createInitialOrchestrationState,
} from "@/lib/agents/orchestrator";
import type { AgentMessage, AgentRole, OrchestrationState } from "@/lib/agents/types";

/** Maximum number of auto-chained agent calls per request */
const MAX_CHAIN_DEPTH = 10;

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
      review_result: "review",
      deploy_ready: "deployment",
      dispatch: "task",
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
 * This replaces replaying full conversation history — agents get only
 * the structured JSON outputs they need.
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

  // Convert to AgentMessages
  const agentMessages: AgentMessage[] = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
    agentRole: (m as unknown as { agentRole?: string }).agentRole as
      | AgentMessage["agentRole"]
      | undefined,
  }));

  // Use client state, or load from DB, or create new
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
      };
    }
  }

  // Load persisted artifacts for context (instead of replaying messages)
  const artifactContext = pipelineId
    ? await loadArtifactContext(pipelineId)
    : "";

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = (data: unknown) =>
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

  /**
   * Save an agent's structured output as an artifact for future reference.
   */
  const saveArtifact = async (agentRole: AgentRole, content: string) => {
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
      },
    });
  };

  // Start streaming in background with PM-controlled chaining
  (async () => {
    try {
      let currentMessages = [...agentMessages];
      let currentState = orchState || createInitialOrchestrationState();
      let chainDepth = 0;

      // Always start with PM Agent
      let dispatchedAgent: string | undefined;
      let dispatchedTask: string | undefined;

      while (chainDepth < MAX_CHAIN_DEPTH) {
        chainDepth++;

        // Route to the appropriate agent
        const dispatch = routeMessage(currentMessages, {
          allowedServices,
          appContext,
          orchestrationState: currentState,
          dispatchedAgent: dispatchedAgent as AgentMessage["agentRole"],
          dispatchedTask,
        });

        // Use artifacts for context instead of replaying full conversation
        const systemPrompt = dispatch.systemPrompt + artifactContext;

        // 1. Send agent metadata + state
        await sendEvent({
          agentRole: dispatch.agentRole,
          orchestrationState: dispatch.orchestrationState,
        });

        // 2. Signal thinking
        await sendEvent({
          thinking: true,
          agentRole: dispatch.agentRole,
        });

        // 3. Generate agent response silently
        const chatMessages: ChatMessage[] = currentMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const result = await streamChat(
          chatMessages,
          () => {},
          model || DEFAULT_MODEL,
          allowedServices,
          systemPrompt
        );

        // 4. Send usage
        if (result.usage) {
          await sendEvent({
            usage: result.usage,
            model: model || DEFAULT_MODEL,
          });
        }

        // Add agent response to message history
        currentMessages = [
          ...currentMessages,
          {
            role: "assistant" as const,
            content: result.content,
            agentRole: dispatch.agentRole,
          },
        ];

        // 5. Persist agent output as artifact
        await saveArtifact(dispatch.agentRole, result.content);

        // 6. Decide what happens next based on which agent just responded
        if (dispatch.agentRole === "pm") {
          const pmAction = parsePMAction(result.content);

          if (pmAction?.action === "dispatch") {
            await sendEvent({ translating: true, agentRole: "pm" });
            const translated = await translateForUser(result.content, "pm");
            if (translated.content) {
              await sendEvent({ content: translated.content, agentRole: "pm" });
            }
            if (translated.usage) {
              await sendEvent({ usage: translated.usage, model: OUTPUT_MODEL });
            }
            await sendEvent({
              agentComplete: true,
              agentRole: "pm",
              rawContent: result.content,
            });

            dispatchedAgent = pmAction.target;
            dispatchedTask = pmAction.task;
            currentState = dispatch.orchestrationState;
            continue;
          }

          if (pmAction?.action === "respond") {
            await sendEvent({ translating: true, agentRole: "pm" });
            const translated = await translateForUser(result.content, "pm");
            const displayContent = translated.content || pmAction.message;
            if (displayContent) {
              await sendEvent({ content: displayContent, agentRole: "pm" });
            }
            if (translated.usage) {
              await sendEvent({ usage: translated.usage, model: OUTPUT_MODEL });
            }
            await sendEvent({
              agentComplete: true,
              agentRole: "pm",
              rawContent: result.content,
            });
            currentState = dispatch.orchestrationState;
            break;
          }

          if (pmAction?.action === "complete") {
            await sendEvent({ translating: true, agentRole: "pm" });
            const translated = await translateForUser(result.content, "pm");
            const displayContent = translated.content || pmAction.summary;
            if (displayContent) {
              await sendEvent({ content: displayContent, agentRole: "pm" });
            }
            if (translated.usage) {
              await sendEvent({ usage: translated.usage, model: OUTPUT_MODEL });
            }
            currentState = stateForComplete(
              dispatch.orchestrationState,
              pmAction.summary
            );
            await sendEvent({
              agentComplete: true,
              agentRole: "pm",
              rawContent: result.content,
              orchestrationState: currentState,
            });
            break;
          }

          // PM didn't output a valid action — treat as respond and stop
          await sendEvent({ translating: true, agentRole: "pm" });
          const translated = await translateForUser(result.content, "pm");
          if (translated.content || result.content) {
            await sendEvent({
              content: translated.content || result.content,
              agentRole: "pm",
            });
          }
          if (translated.usage) {
            await sendEvent({ usage: translated.usage, model: OUTPUT_MODEL });
          }
          await sendEvent({
            agentComplete: true,
            agentRole: "pm",
            rawContent: result.content,
          });
          currentState = dispatch.orchestrationState;
          break;
        } else {
          // Specialist agent completed — translate, then loop back to PM
          await sendEvent({
            translating: true,
            agentRole: dispatch.agentRole,
          });

          const translated = await translateForUser(
            result.content,
            dispatch.agentRole
          );
          if (translated.content || result.content) {
            await sendEvent({
              content: translated.content || result.content,
              agentRole: dispatch.agentRole,
            });
          }
          if (translated.usage) {
            await sendEvent({ usage: translated.usage, model: OUTPUT_MODEL });
          }

          const agentResult = parseAgentResult(result.content);
          currentState = stateForAgentComplete(
            dispatch.orchestrationState,
            dispatch.agentRole,
            agentResult.summary
          );

          await sendEvent({
            agentComplete: true,
            agentRole: dispatch.agentRole,
            rawContent: result.content,
            orchestrationState: currentState,
          });

          // Loop back to PM for next decision
          dispatchedAgent = undefined;
          dispatchedTask = undefined;
        }
      }

      // Persist orchestration state
      if (pipelineId && currentState) {
        await prisma.agentPipeline.update({
          where: { id: pipelineId },
          data: {
            status: currentState.status,
            currentAgent: currentState.currentAgent || "pm",
            completedAgents: currentState.tasks
              .filter((t) => t.status === "completed")
              .map((t) => t.agentRole),
            tasks: JSON.parse(JSON.stringify(currentState.tasks)),
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
