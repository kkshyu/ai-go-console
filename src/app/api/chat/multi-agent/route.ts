import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  streamChat,
  translateForUser,
  stripJsonBlocks,
  buildAppContextPrompt,
  DEFAULT_MODEL,
  OUTPUT_MODEL,
  type ChatMessage,
} from "@/lib/ai";
import { buildFileTreeContext } from "@/lib/file-context";
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

/** Interval for sending progress updates to the user (ms) — at most every 3 seconds */
const PROGRESS_INTERVAL_MS = 3000;

/**
 * Progress messages shown to the user while waiting for each agent.
 * PM sends these as meaningful, conversational updates to keep the user informed.
 */
const PROGRESS_MESSAGES: Record<string, string[]> = {
  architect: [
    "我正在請架構師分析您的需求，評估最合適的技術方案",
    "架構師正在比較不同的框架選項，為您的應用找到最佳組合",
    "架構師正在規劃資料庫結構和 API 設計",
    "架構師正在確認技術選型與服務整合方案",
    "架構設計即將完成，馬上為您整理結果",
  ],
  developer: [
    "開發團隊開始建立您的應用程式了",
    "開發者正在搭建專案結構，設定所需的套件和相依性",
    "正在實作核心功能模組和頁面元件",
    "開發者正在串接資料庫和外部服務",
    "程式碼撰寫接近完成，正在做最後調整",
  ],
  reviewer: [
    "程式碼審查員正在檢查程式碼品質和安全性",
    "審查員正在確認是否有潛在的安全漏洞或效能問題",
    "正在驗證程式碼是否符合最佳實踐",
    "審查即將完成，正在整理改善建議",
  ],
  devops: [
    "DevOps 工程師正在配置應用程式的部署環境",
    "正在設定服務連接和環境變數",
    "正在確認部署設定，準備啟動應用程式",
    "部署配置即將完成",
  ],
  pm: [
    "我正在分析各專家的回饋，規劃下一步行動",
    "正在彙整目前的進度，看看還需要什麼",
    "讓我確認一下所有環節都沒問題",
    "正在協調團隊，確保每個階段都順利進行",
    "我正在整理最終結果，馬上就好",
  ],
};

/**
 * Fallback messages when translation returns empty content.
 * Ensures the user always sees something instead of a permanent spinner.
 */
const FALLBACK_MESSAGES: Record<string, Record<string, string>> = {
  pm: {
    dispatch: "正在安排專家處理您的需求...",
    respond: "正在回覆您的問題...",
    complete: "所有工作已完成！",
    default: "正在處理中...",
  },
  architect: { default: "架構設計已完成。" },
  developer: { default: "開發工作已完成。" },
  reviewer: { default: "程式碼審查已完成。" },
  devops: { default: "部署設定已完成。" },
};

function getFallbackMessage(agentRole: string, action?: string): string {
  const agentMessages = FALLBACK_MESSAGES[agentRole] || FALLBACK_MESSAGES.pm;
  return (action && agentMessages[action]) || agentMessages.default || "處理完成。";
}

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

    // Load service instances scoped to user role:
    // - Admin: all org service instances
    // - Regular user: only instances authorized via UserAllowedServiceInstance
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
    /**
     * Translate agent output with a progress timer so the user sees updates
     * during the translation phase (which can take 3-8 seconds).
     */
    const translateWithProgress = async (
      content: string,
      agentRole: AgentRole
    ) => {
      const TRANSLATE_MESSAGES = [
        "正在整理回覆內容...",
        "正在準備顯示結果...",
      ];
      let idx = 0;
      const timer = setInterval(async () => {
        const msg = TRANSLATE_MESSAGES[Math.min(idx, TRANSLATE_MESSAGES.length - 1)];
        idx++;
        try {
          await sendEvent({ statusUpdate: msg, agentRole });
        } catch { /* stream may have closed */ }
      }, PROGRESS_INTERVAL_MS);

      try {
        return await translateForUser(content, agentRole);
      } finally {
        clearInterval(timer);
      }
    };

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
          serviceInstances,
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
        // Annotate messages so the current agent understands who said what.
        // Specialist agent outputs are prefixed with their role so PM can
        // distinguish its own messages from specialist responses.
        const chatMessages: ChatMessage[] = currentMessages.map((m) => {
          if (
            m.role === "assistant" &&
            m.agentRole &&
            m.agentRole !== dispatch.agentRole
          ) {
            return {
              role: m.role,
              content: `[${m.agentRole.toUpperCase()} AGENT OUTPUT]:\n${m.content}`,
            };
          }
          return { role: m.role, content: m.content };
        });

        // Send periodic progress updates while the agent generates
        let progressIdx = 0;
        const agentMsgs = PROGRESS_MESSAGES[dispatch.agentRole] || PROGRESS_MESSAGES.pm;
        const progressTimer = setInterval(async () => {
          const msg = agentMsgs[Math.min(progressIdx, agentMsgs.length - 1)];
          progressIdx++;
          try {
            await sendEvent({
              statusUpdate: msg,
              agentRole: dispatch.agentRole,
            });
          } catch {
            // Stream may have closed
          }
        }, PROGRESS_INTERVAL_MS);

        let result;
        try {
          result = await streamChat(
            chatMessages,
            () => {},
            model || DEFAULT_MODEL,
            allowedServices,
            systemPrompt
          );
        } catch (err) {
          clearInterval(progressTimer);
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          await sendEvent({ error: `${dispatch.agentRole} agent failed: ${errMsg}` });
          // If specialist fails, skip to next iteration so PM can handle it
          if (dispatch.agentRole !== "pm") {
            currentMessages = [
              ...currentMessages,
              {
                role: "assistant" as const,
                content: `\`\`\`json\n{"status": "blocked", "blockedReason": "${errMsg}"}\n\`\`\``,
                agentRole: dispatch.agentRole,
              },
            ];
            const agentResult = parseAgentResult(`\`\`\`json\n{"status": "blocked", "blockedReason": "${errMsg}"}\n\`\`\``);
            currentState = stateForAgentComplete(
              dispatch.orchestrationState,
              dispatch.agentRole,
              agentResult.summary
            );
            await sendEvent({
              agentComplete: true,
              agentRole: dispatch.agentRole,
              orchestrationState: currentState,
            });
            dispatchedAgent = undefined;
            dispatchedTask = undefined;
            continue;
          }
          break;
        }

        clearInterval(progressTimer);

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
            const translated = await translateWithProgress(result.content, "pm");
            const dispatchContent = translated.content || getFallbackMessage("pm", "dispatch");
            await sendEvent({ content: dispatchContent, agentRole: "pm" });
            if (translated.usage) {
              await sendEvent({ usage: translated.usage, model: OUTPUT_MODEL });
            }
            await sendEvent({
              agentComplete: true,
              agentRole: "pm",
              rawContent: result.content,
              orchestrationState: dispatch.orchestrationState,
            });

            dispatchedAgent = pmAction.target;
            dispatchedTask = pmAction.task;
            currentState = dispatch.orchestrationState;
            continue;
          }

          if (pmAction?.action === "respond") {
            await sendEvent({ translating: true, agentRole: "pm" });
            const translated = await translateWithProgress(result.content, "pm");
            const displayContent = translated.content || pmAction.message || getFallbackMessage("pm", "respond");
            await sendEvent({ content: displayContent, agentRole: "pm" });
            if (translated.usage) {
              await sendEvent({ usage: translated.usage, model: OUTPUT_MODEL });
            }
            await sendEvent({
              agentComplete: true,
              agentRole: "pm",
              rawContent: result.content,
              needsUserInput: true,
            });
            currentState = dispatch.orchestrationState;
            break;
          }

          if (pmAction?.action === "complete") {
            await sendEvent({ translating: true, agentRole: "pm" });
            const translated = await translateWithProgress(result.content, "pm");
            const displayContent = translated.content || pmAction.summary || getFallbackMessage("pm", "complete");
            await sendEvent({ content: displayContent, agentRole: "pm" });
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

          // PM didn't output a valid action.
          // If all dispatched tasks are completed, auto-complete the workflow.
          const allTasksDone = dispatch.orchestrationState.tasks.length > 0 &&
            dispatch.orchestrationState.tasks.every((t) => t.status === "completed");

          if (allTasksDone) {
            const summary = `Completed ${dispatch.orchestrationState.tasks.length} tasks: ${dispatch.orchestrationState.tasks.map((t) => t.agentRole).join(", ")}`;
            await sendEvent({ translating: true, agentRole: "pm" });
            const translated = await translateWithProgress(result.content || summary, "pm");
            if (translated.content || summary) {
              await sendEvent({
                content: translated.content || summary,
                agentRole: "pm",
              });
            }
            if (translated.usage) {
              await sendEvent({ usage: translated.usage, model: OUTPUT_MODEL });
            }
            currentState = stateForComplete(dispatch.orchestrationState, summary);
            await sendEvent({
              agentComplete: true,
              agentRole: "pm",
              rawContent: result.content,
              orchestrationState: currentState,
            });
            break;
          }

          // Otherwise treat as a respond and stop
          await sendEvent({ translating: true, agentRole: "pm" });
          const translated = await translateWithProgress(result.content, "pm");
          const fallbackContent = translated.content || stripJsonBlocks(result.content) || getFallbackMessage("pm", "default");
          await sendEvent({
            content: fallbackContent,
            agentRole: "pm",
          });
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

          const translated = await translateWithProgress(
            result.content,
            dispatch.agentRole
          );
          const agentContent = translated.content || stripJsonBlocks(result.content) || getFallbackMessage(dispatch.agentRole);
          await sendEvent({
            content: agentContent,
            agentRole: dispatch.agentRole,
          });
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
