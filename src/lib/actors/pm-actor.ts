/**
 * PM Agent Actor
 *
 * The PM (Product Manager) is the central orchestrator in the actor system.
 * It receives user messages, runs LLM to decide actions, and delegates
 * execution (dispatch, parallel, DAG) to WorkflowRunner.
 *
 * PM retains: LLM decision loop, message history, orchestration state.
 * WorkflowRunner handles: dispatch, parallel merge, DAG, worker tracking, post-processing.
 */

import { Actor } from "./actor";
import type {
  ActorMessage,
} from "./types";
import { createMessage } from "./types";
import {
  streamChat,
  translateForUser,
  stripJsonBlocks,
  getOutputModel,
  type ChatMessage,
} from "../ai";
import { getModelForTier } from "../model-tiers";
import type { AgentRole, OrchestrationState, AgentMessage as AgentMsg } from "../agents/types";
import { createInitialOrchestrationState } from "../agents/types";
import {
  stateForAgentComplete,
  stateForComplete,
  parsePMActions,
} from "../agents/orchestrator";
import { validatePMAction } from "../services/llm-output-validator";
import { actorLog } from "./logger";
import { pruneMessages } from "../ai/token-budget";
import type { BackgroundActorSystem } from "./background-system";
import type { ActorSystem } from "./actor-system";
import { WorkflowRunner, type WorkflowRunnerConfig, type WorkflowCallbacks } from "./workflow-runner";
import {
  getDispatchMessage as i18nDispatchMessage,
  getParallelDispatchMessage as i18nParallelDispatchMessage,
  getFallbackMessage as i18nFallbackMessage,
  getRateLimitMessage,
  getApiTimeoutMessage,
  getProgressMessage,
} from "../../i18n/pm-messages";

/** Maximum number of agent interactions per request. */
const MAX_INTERACTIONS = 20;

/** Exponential backoff with jitter for rate limits */
const BACKOFF_BASE_MS = 2_000;
const BACKOFF_CAP_MS = 30_000;

function calculateBackoff(attempt: number): number {
  const exponential = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * Math.pow(2, attempt));
  const jitter = exponential * (0.75 + Math.random() * 0.5); // ±25% jitter
  return Math.round(jitter);
}

const PROGRESS_INTERVAL_MS = 2500;

export interface PMActorConfig {
  model: string;
  serviceInstances: Array<{ id: string; name: string; type: string; status?: 'ok' | 'failed' | 'untested'; message?: string }>;
  appContext?: string;
  artifactContext: string;
  fileContext?: string;
  sendEvent: (data: unknown) => Promise<void>;
  saveArtifact: (agentRole: AgentRole, content: string, actorId?: string, taskId?: string) => Promise<void>;
  system: ActorSystem;
  pmPrompt: string;
  locale?: string;
  appSlug?: string;
  appId?: string;
  userId?: string;
  orgSlug?: string;
  conversationId?: string;
  backgroundSystem?: BackgroundActorSystem;
  orgModelConfigs?: Array<{ agentRole: string; modelId: string }>;
}

export class PMActor extends Actor {
  private config: PMActorConfig;
  private orchState: OrchestrationState;
  private interactionCount = 0;
  private messages: AgentMsg[] = [];
  private workflow: WorkflowRunner;

  // Timer tracking for GC
  private activeTimers: Set<ReturnType<typeof setInterval>> = new Set();
  // Abort controller for lifecycle management
  private abortController = new AbortController();
  // Request-level timeout (5 minutes max per orchestration)
  private requestTimeout: ReturnType<typeof setTimeout> | null = null;
  private static readonly REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

  constructor(config: PMActorConfig, initialState?: OrchestrationState) {
    super("pm-0", "pm");
    this.config = config;
    this.orchState = initialState || createInitialOrchestrationState();

    // Build WorkflowRunner with callbacks into PM state
    const runnerConfig: WorkflowRunnerConfig = {
      model: config.model,
      serviceInstances: config.serviceInstances,
      appContext: config.appContext,
      artifactContext: config.artifactContext,
      fileContext: config.fileContext,
      sendEvent: config.sendEvent,
      saveArtifact: config.saveArtifact,
      system: config.system,
      locale: config.locale,
      conversationId: config.conversationId,
      backgroundSystem: config.backgroundSystem,
      orgModelConfigs: config.orgModelConfigs,
      appSlug: config.appSlug,
      appId: config.appId,
      userId: config.userId,
      orgSlug: config.orgSlug,
    };

    const callbacks: WorkflowCallbacks = {
      getOrchState: () => this.orchState,
      setOrchState: (state) => { this.orchState = state; },
      getMessages: () => this.messages,
      addMessage: (msg) => { this.messages.push(msg); },
      continueLoop: () => this.runPMLoop(),
      pmActorId: this.id,
      traceId: config.system.traceId,
    };

    this.workflow = new WorkflowRunner(runnerConfig, callbacks);
  }

  async onStart(): Promise<void> {
    // Start request-level timeout
    this.requestTimeout = setTimeout(() => {
      actorLog("warn", this.id, "Request timeout reached, aborting", this.traceId);
      this.abortController.abort();
      this.orchState = { ...this.orchState, status: "error" };
      this.config.sendEvent({ error: "Request timeout reached" }).catch(() => {});
      this.config.system.signalCompletion(this.orchState);
    }, PMActor.REQUEST_TIMEOUT_MS);

    // Start worker status tracking via workflow runner
    this.workflow.startStatusTracking();
  }

  onStop(): void {
    // Clear all timers
    for (const timer of this.activeTimers) {
      clearInterval(timer);
    }
    this.activeTimers.clear();

    // Clear request timeout
    if (this.requestTimeout) {
      clearTimeout(this.requestTimeout);
      this.requestTimeout = null;
    }

    // Abort any in-flight operations
    this.abortController.abort();

    // Stop workflow runner (clears parallel/DAG/worker state)
    this.workflow.stop();
  }

  /** Check if the orchestration has been aborted. */
  private get isAborted(): boolean {
    return this.abortController.signal.aborted;
  }

  async onRestart(error: Error): Promise<void> {
    actorLog("warn", this.id, `Restarting after error: ${error.message}`, this.traceId);
    // Reset abort controller on restart
    this.abortController = new AbortController();
  }

  async onReceive(message: ActorMessage): Promise<ActorMessage | null> {
    switch (message.type) {
      case "task":
        return this.handleUserMessage(message);
      case "task_result":
        return this.handleAgentResult(message);
      case "report":
        return this.handleReport(message);
      case "parallel_result":
        return this.handleParallelResult(message);
      case "error":
        return this.handleAgentError(message);
      case "senior_plan":
        // Senior plan event — forward to UI for observability
        await this.config.sendEvent({
          seniorPlan: message.payload,
          agentRole: (message.payload as { agentRole: string }).agentRole,
        });
        return null;
      default:
        return null;
    }
  }

  // ---- User Message ----

  private async handleUserMessage(message: ActorMessage & { type: "task" }): Promise<ActorMessage | null> {
    const payload = message.payload;

    // Initialize messages from payload
    if (payload.messages) {
      this.messages = payload.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        agentRole: m.agentRole as AgentRole | undefined,
      }));
    }

    // Start PM decision loop
    await this.runPMLoop();
    return null;
  }

  // ---- Agent Result (task_result) ----

  private async handleAgentResult(message: ActorMessage & { type: "task_result" }): Promise<ActorMessage | null> {
    const payload = message.payload;
    const { sendEvent, saveArtifact } = this.config;

    // Check if this is a DAG result — delegate to workflow runner
    if (this.workflow.handleDAGResult(payload, message.from)) {
      await saveArtifact(payload.agentRole, payload.content, message.from, payload.dagNodeId);
      return null;
    }

    // Mark worker as complete
    this.workflow.markWorkerComplete(message.from);

    // Save artifact
    await saveArtifact(payload.agentRole, payload.content);

    // Delegate post-processing
    try {
      await this.workflow.postProcess(payload.content);
    } catch (ppErr) {
      actorLog("warn", this.id, `Post-processing failed (non-fatal): ${ppErr instanceof Error ? ppErr.message : ppErr}`, this.traceId);
    }

    // Update state (pass actorId for precise matching)
    this.orchState = stateForAgentComplete(
      this.orchState,
      payload.agentRole,
      payload.summary,
      message.from
    );

    // Send completion event
    await sendEvent({
      agentComplete: true,
      agentRole: payload.agentRole,
      rawContent: payload.content,
      orchestrationState: this.orchState,
    });

    // Add to message history
    this.messages.push({
      role: "assistant",
      content: payload.content,
      agentRole: payload.agentRole,
    });

    // Continue PM decision loop
    await this.runPMLoop();
    return null;
  }

  // ---- Report (includes discussion log from peer communication) ----

  private async handleReport(message: ActorMessage & { type: "report" }): Promise<ActorMessage | null> {
    const payload = message.payload;
    const { sendEvent, saveArtifact } = this.config;

    // Mark worker as complete
    this.workflow.markWorkerComplete(message.from);

    // Save artifact
    await saveArtifact(payload.agentRole, payload.content);

    // Delegate post-processing
    try {
      await this.workflow.postProcess(payload.content);
    } catch (ppErr) {
      actorLog("warn", this.id, `Post-processing failed (non-fatal): ${ppErr instanceof Error ? ppErr.message : ppErr}`, this.traceId);
    }

    // Update state (pass actorId for precise matching)
    this.orchState = stateForAgentComplete(
      this.orchState,
      payload.agentRole,
      payload.summary,
      message.from
    );

    // Log discussion if present
    if (payload.discussionLog && payload.discussionLog.length > 0) {
      actorLog("info", this.id, `Worker ${payload.agentRole} conducted ${payload.discussionLog.length} discussion exchanges`, this.traceId);
      await sendEvent({
        discussionComplete: {
          agentRole: payload.agentRole,
          exchangeCount: payload.discussionLog.length,
        },
      });
    }

    // Send completion event
    await sendEvent({
      agentComplete: true,
      agentRole: payload.agentRole,
      rawContent: payload.content,
      orchestrationState: this.orchState,
    });

    // Add to message history (include discussion context)
    const contentWithDiscussion = payload.discussionLog && payload.discussionLog.length > 0
      ? `${payload.content}\n\n--- PEER DISCUSSIONS ---\n${payload.discussionLog.join("\n")}`
      : payload.content;

    this.messages.push({
      role: "assistant",
      content: contentWithDiscussion,
      agentRole: payload.agentRole,
    });

    // Continue PM decision loop
    await this.runPMLoop();
    return null;
  }

  // ---- Parallel Result (delegated to WorkflowRunner) ----

  private async handleParallelResult(message: ActorMessage & { type: "parallel_result" }): Promise<ActorMessage | null> {
    await this.workflow.handleParallelResult(message.payload, message.from);
    return null;
  }

  // ---- Agent Error (with deterministic recovery) ----

  private async handleAgentError(message: ActorMessage & { type: "error" }): Promise<ActorMessage | null> {
    const payload = message.payload;
    const { sendEvent } = this.config;

    // Mark worker as error
    this.workflow.markWorkerError(payload.actorId);

    // Check if this is a DAG error — delegate to workflow runner
    if (this.workflow.handleDAGError(payload.actorId, payload.error)) {
      return null;
    }

    actorLog("warn", this.id, `Agent error: ${payload.agentRole} (${payload.errorType}): ${payload.error}`, this.traceId);

    // If we're in parallel mode, delegate to workflow runner
    if (this.workflow.isInParallelMode) {
      await this.workflow.handleParallelError(payload.actorId, payload.agentRole, payload.error);
      return null;
    }

    // Deterministic recovery based on error type
    switch (payload.errorType) {
      case "rate_limit": {
        const workerStatus = this.workflow.getWorkerStatus(payload.actorId);
        const retryCount = workerStatus?.retryCount ?? 0;
        const backoffMs = calculateBackoff(retryCount);
        if (workerStatus) workerStatus.retryCount = retryCount + 1;
        actorLog("info", this.id, `Rate limit hit, backing off ${backoffMs}ms (attempt ${retryCount + 1})`, this.traceId);
        await sendEvent({ statusUpdate: getRateLimitMessage(this.config.locale), agentRole: "pm" });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        // Add a note to history and let PM loop retry
        this.messages.push({
          role: "assistant",
          content: `[SYSTEM]: Agent ${payload.agentRole} hit rate limit. Retrying after backoff.`,
          agentRole: payload.agentRole,
        });
        await this.runPMLoop();
        return null;
      }

      case "api_timeout": {
        await sendEvent({ statusUpdate: getApiTimeoutMessage(this.config.locale), agentRole: "pm" });
        this.messages.push({
          role: "assistant",
          content: `\`\`\`json\n{"status": "blocked", "blockedReason": "API timeout - ${payload.error}"}\n\`\`\``,
          agentRole: payload.agentRole,
        });
        this.orchState = stateForAgentComplete(this.orchState, payload.agentRole, `Failed: API timeout`);
        await this.runPMLoop();
        return null;
      }

      default: {
        // For unknown/invalid_response errors, fall through to LLM-based recovery
        await sendEvent({
          error: `Agent ${payload.agentRole} failed permanently: ${payload.error}`,
        });

        this.messages.push({
          role: "assistant",
          content: `\`\`\`json\n{"status": "blocked", "blockedReason": "${payload.error}"}\n\`\`\``,
          agentRole: payload.agentRole,
        });

        this.orchState = stateForAgentComplete(
          this.orchState,
          payload.agentRole,
          `Failed: ${payload.error}`
        );

        // Continue PM loop to handle the failure
        await this.runPMLoop();
        return null;
      }
    }
  }

  // ---- PM Decision Loop ----

  private async runPMLoop(): Promise<void> {
    const { sendEvent, saveArtifact, system } = this.config;

    while (this.interactionCount < MAX_INTERACTIONS) {
      // Check abort before each iteration
      if (this.isAborted) {
        this.orchState = { ...this.orchState, status: "error" };
        system.signalCompletion(this.orchState);
        return;
      }

      this.interactionCount++;

      // Send PM agent metadata
      this.orchState = { ...this.orchState, status: "running", currentAgent: "pm" };
      await sendEvent({
        agentRole: "pm",
        orchestrationState: this.orchState,
      });

      // Signal thinking
      await sendEvent({ thinking: true, agentRole: "pm" });

      // Prune messages to fit within token budget before sending to LLM
      const TOKEN_BUDGET = 80_000; // Reserve ~20k for system prompt + response
      const prunedMessages = pruneMessages(this.messages, TOKEN_BUDGET);

      // Build chat messages with agent annotations
      const chatMessages: ChatMessage[] = prunedMessages.map((m) => {
        if (m.role === "assistant" && m.agentRole && m.agentRole !== "pm") {
          return {
            role: m.role,
            content: `[${m.agentRole.toUpperCase()} AGENT OUTPUT]:\n${m.content}`,
          };
        }
        return { role: m.role, content: m.content };
      });

      // Ensure conversation ends with a user message (required by some providers like Azure)
      if (chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === "assistant") {
        chatMessages.push({ role: "user", content: "Please continue based on the above context. What is your next action?" });
      }

      // Progress updates while PM generates
      let progressIdx = 0;
      const progressTimer = setInterval(async () => {
        const msg = getProgressMessage(progressIdx, "pm", this.config.locale);
        progressIdx++;
        try {
          await sendEvent({ statusUpdate: msg, agentRole: "pm" });
        } catch { /* stream may have closed */ }
      }, PROGRESS_INTERVAL_MS);
      this.activeTimers.add(progressTimer);

      const pmModel = getModelForTier("pm", "senior", this.config.model, this.config.orgModelConfigs);
      let result;
      try {
        const systemPrompt = this.config.pmPrompt + this.config.artifactContext + (this.config.fileContext || "");
        result = await streamChat(
          chatMessages,
          () => { this.updateHeartbeat(); },
          pmModel,
          systemPrompt
        );
      } catch (err) {
        clearInterval(progressTimer);
        this.activeTimers.delete(progressTimer);
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        actorLog("error", this.id, `PM LLM failed: ${errMsg}`, this.traceId);
        await sendEvent({ error: `PM agent failed: ${errMsg}` });
        this.orchState = { ...this.orchState, status: "error" };
        system.signalCompletion(this.orchState);
        return;
      }

      clearInterval(progressTimer);
      this.activeTimers.delete(progressTimer);

      // Send usage
      if (result.usage) {
        await sendEvent({ usage: result.usage, model: pmModel });
      }

      // Add PM response to history
      this.messages.push({
        role: "assistant",
        content: result.content,
        agentRole: "pm",
      });

      // Save PM artifact
      await saveArtifact("pm", result.content);

      // Extract all PM actions (may include update_prd + main action)
      const allActions = parsePMActions(result.content);

      // Process update_prd actions first (send prdUpdate events to client)
      for (const act of allActions) {
        if (act.action === "update_prd") {
          await sendEvent({ prdUpdate: act.prd });
        }
      }

      // Parse and validate main PM action (non-prd action)
      const validated = validatePMAction(result.content);
      const pmAction = "action" in validated ? validated.action : null;
      if ("error" in validated) {
        // If we only had update_prd, that's fine — treat as respond with needsUserInput
        const hasOnlyPrd = allActions.length > 0 && allActions.every((a) => a.action === "update_prd");
        if (hasOnlyPrd) {
          await sendEvent({
            agentComplete: true,
            agentRole: "pm",
            rawContent: result.content,
            needsUserInput: true,
          });
          system.signalCompletion(this.orchState);
          return;
        }
        actorLog("warn", this.id, `PM action validation: ${validated.error}`, this.traceId);
      }

      // ---- Handle dispatch (delegated to WorkflowRunner) ----
      if (pmAction?.action === "dispatch") {
        await sendEvent({
          pmMessage: i18nDispatchMessage(pmAction.target, pmAction.task, this.config.locale),
          agentRole: "pm",
        });
        await sendEvent({
          agentComplete: true,
          agentRole: "pm",
          rawContent: result.content,
          orchestrationState: this.orchState,
        });

        await this.workflow.dispatchSingle(pmAction.target, pmAction.task);
        return; // Wait for specialist result
      }

      // ---- Handle dispatch_parallel (delegated to WorkflowRunner) ----
      if (pmAction?.action === "dispatch_parallel") {
        const parallelTasks = (pmAction as { tasks: Array<{ taskId: string; task: string; files: string[] }> }).tasks;
        await sendEvent({
          pmMessage: i18nParallelDispatchMessage(parallelTasks.length, this.config.locale),
          agentRole: "pm",
        });
        await sendEvent({
          agentComplete: true,
          agentRole: "pm",
          rawContent: result.content,
          orchestrationState: this.orchState,
        });

        await this.workflow.dispatchParallel(parallelTasks);
        return; // Wait for all parallel results
      }

      // ---- Handle execute_dag (delegated to WorkflowRunner) ----
      if (pmAction?.action === "execute_dag") {
        const dag = (pmAction as unknown as { dag: import("../agents/types").ExecutionDAG }).dag;
        await sendEvent({
          pmMessage: `Executing DAG pipeline with ${dag.nodes.length} agents...`,
          agentRole: "pm",
        });
        await sendEvent({
          agentComplete: true,
          agentRole: "pm",
          rawContent: result.content,
          orchestrationState: this.orchState,
        });

        await this.workflow.executeDAG(dag);
        return; // Wait for DAG completion
      }

      // ---- Handle respond ----
      if (pmAction?.action === "respond") {
        const displayContent = await this.getDisplayContent(result.content, "respond");

        await sendEvent({
          pmMessage: displayContent,
          agentRole: "pm",
        });
        await sendEvent({
          agentComplete: true,
          agentRole: "pm",
          rawContent: result.content,
          needsUserInput: true,
        });

        system.signalCompletion(this.orchState);
        return;
      }

      // ---- Handle complete ----
      if (pmAction?.action === "complete") {
        const displayContent = await this.getDisplayContent(result.content, "complete");

        this.orchState = stateForComplete(this.orchState, pmAction.summary);
        await sendEvent({
          pmMessage: displayContent,
          agentRole: "pm",
        });
        await sendEvent({
          agentComplete: true,
          agentRole: "pm",
          rawContent: result.content,
          orchestrationState: this.orchState,
        });

        system.signalCompletion(this.orchState);
        return;
      }

      // ---- No valid action — auto-complete if all tasks done ----
      const allTasksDone =
        this.orchState.tasks.length > 0 &&
        this.orchState.tasks.every((t) => t.status === "completed");

      if (allTasksDone) {
        const summary = `Completed ${this.orchState.tasks.length} tasks: ${this.orchState.tasks.map((t) => t.agentRole).join(", ")}`;
        const displayContent = await this.getDisplayContent(result.content || summary, "complete");

        this.orchState = stateForComplete(this.orchState, summary);
        await sendEvent({
          pmMessage: displayContent,
          agentRole: "pm",
        });
        await sendEvent({
          agentComplete: true,
          agentRole: "pm",
          rawContent: result.content,
          orchestrationState: this.orchState,
        });

        system.signalCompletion(this.orchState);
        return;
      }

      // Fallback: treat as respond
      const fallbackContent = await this.getDisplayContent(result.content, "default");
      await sendEvent({
        pmMessage: fallbackContent,
        agentRole: "pm",
      });
      await sendEvent({
        agentComplete: true,
        agentRole: "pm",
        rawContent: result.content,
      });

      system.signalCompletion(this.orchState);
      return;
    }

    // Max interactions reached
    this.orchState = stateForComplete(this.orchState, "Max interactions reached");
    this.config.system.signalCompletion(this.orchState);
  }

  // ---- Translation Helper ----

  /**
   * Translate agent output to user-facing content.
   * Returns the display string without sending SSE content events.
   */
  private async getDisplayContent(content: string, action: string): Promise<string> {
    const { sendEvent } = this.config;

    await sendEvent({ translating: true, agentRole: "pm" });

    const translated = await translateForUser(content, "pm", this.config.locale);
    // Fallback: strip JSON blocks and agent output labels for readable text
    const fallbackContent = stripJsonBlocks(content)
      .replace(/\[([A-Z_]+)\s+AGENT\s+OUTPUT\]\s*[:：]\s*/g, "")
      .trim();
    const humanMessage =
      translated.content ||
      fallbackContent ||
      i18nFallbackMessage(action, this.config.locale);

    if (translated.usage) {
      await sendEvent({ usage: translated.usage, model: getOutputModel() });
    }

    // Extract JSON code blocks from raw content to append as collapsible system info
    const jsonBlocks = content.match(/```json\s*\n[\s\S]*?\n```/g);
    if (jsonBlocks && jsonBlocks.length > 0) {
      // Append raw JSON blocks after the human message so MarkdownContent renders them as collapsible
      return `${humanMessage}\n\n${jsonBlocks.join("\n\n")}`;
    }

    return humanMessage;
  }
}
