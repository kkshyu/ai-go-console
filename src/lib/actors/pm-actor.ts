/**
 * PM Agent Actor
 *
 * The PM (Product Manager) is the central orchestrator in the actor system.
 * It receives user messages, runs LLM to decide actions, dispatches to
 * specialist actors, and handles parallel developer coordination.
 *
 * PM actively tracks worker status and handles both task_result and report
 * messages from workers (report includes discussion logs from peer communication).
 *
 * Post-processing side effects (file operations, service binding) are
 * delegated to PostProcessor to keep this class focused on orchestration.
 */

import { Actor } from "./actor";
import { ActorSystem } from "./actor-system";
import type {
  ActorMessage,
  TaskPayload,
  ParallelResultPayload,
  ParallelTaskPayload,
} from "./types";
import { createMessage } from "./types";
import {
  streamChat,
  translateForUser,
  stripJsonBlocks,
  getModelForAgent,
  getOutputModel,
  type ChatMessage,
} from "../ai";
import type { AgentRole, OrchestrationState, AgentMessage as AgentMsg } from "../agents/types";
import { createInitialOrchestrationState } from "../agents/types";
import {
  stateForDispatch,
  stateForAgentComplete,
  stateForComplete,
  parsePMActions,
} from "../agents/orchestrator";
import { createSpecialistActor, type SpecialistConfig } from "./specialist-actors";
import { PostProcessor, type PostProcessorConfig } from "./post-processor";
import {
  mergeParallelOutputs,
  mergeResultToContent,
  type MergeResult,
} from "../services/parallel-merge";
import { validatePMAction } from "../services/llm-output-validator";
import { actorLog } from "./logger";
import { pruneMessages } from "../ai/token-budget";
import type { BackgroundActorSystem } from "./background-system";

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

/** Worker status tracking interval */
const STATUS_CHECK_INTERVAL_MS = 30_000;

/** Worker stale threshold (no heartbeat) */
const WORKER_STALE_MS = 60_000;

/** Worker long-running threshold */
const WORKER_LONG_RUNNING_MS = 180_000;

const PM_PROGRESS_MESSAGES = [
  "正在分析進度...",
  "正在規劃下一步...",
  "正在整理結果...",
  "正在準備派發下一個任務...",
  "正在確認工作流程...",
  "正在彙整各方資訊...",
  "仍在處理中，請稍候...",
  "即將完成分析...",
];

const PROGRESS_INTERVAL_MS = 2500;

const FALLBACK_MESSAGES: Record<string, Record<string, string>> = {
  pm: {
    dispatch: "正在安排專家處理您的需求...",
    respond: "正在回覆您的問題...",
    complete: "所有工作已完成！",
    default: "正在處理中...",
  },
};

function getFallbackMessage(action?: string): string {
  return (action && FALLBACK_MESSAGES.pm[action]) || FALLBACK_MESSAGES.pm.default || "處理完成。";
}

interface WorkerStatus {
  role: AgentRole;
  actorId: string;
  dispatchedAt: number;
  lastHeartbeat: number;
  status: "running" | "completed" | "error";
  retryCount: number;
}

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
}

export class PMActor extends Actor {
  private config: PMActorConfig;
  private orchState: OrchestrationState;
  private interactionCount = 0;
  private messages: AgentMsg[] = [];
  private postProcessor: PostProcessor;

  // Parallel execution tracking
  private pendingParallelResults: Map<string, ParallelResultPayload> = new Map();
  private expectedParallelCount = 0;
  private currentGroupId: string | null = null;
  private parallelTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Timeout for collecting all parallel results (3 minutes). */
  private static readonly PARALLEL_TIMEOUT_MS = 3 * 60 * 1000;

  // Worker status tracking
  private workerStatusTracker: Map<string, WorkerStatus> = new Map();
  private statusCheckTimer: ReturnType<typeof setInterval> | null = null;

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

    // Initialize post-processor with delegated config
    const ppConfig: PostProcessorConfig = {
      appSlug: config.appSlug,
      appId: config.appId,
      userId: config.userId,
      orgSlug: config.orgSlug,
      serviceInstances: config.serviceInstances,
      sendEvent: config.sendEvent,
      traceId: config.system.traceId,
    };
    this.postProcessor = new PostProcessor(ppConfig);
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

    // Start worker status tracking
    this.startStatusTracking();
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

    // Clear parallel timeout
    if (this.parallelTimeout) {
      clearTimeout(this.parallelTimeout);
      this.parallelTimeout = null;
    }

    // Clear status check timer
    if (this.statusCheckTimer) {
      clearInterval(this.statusCheckTimer);
      this.statusCheckTimer = null;
    }

    // Abort any in-flight operations
    this.abortController.abort();

    // Reject pending parallel results
    this.pendingParallelResults.clear();
    this.expectedParallelCount = 0;
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
      default:
        return null;
    }
  }

  // ---- Worker Status Tracking ----

  private startStatusTracking(): void {
    this.statusCheckTimer = setInterval(async () => {
      const now = Date.now();
      for (const [actorId, status] of this.workerStatusTracker) {
        if (status.status !== "running") continue;

        const elapsed = now - status.dispatchedAt;
        const sinceLast = now - status.lastHeartbeat;

        // Worker is stale — send heartbeat ping
        if (sinceLast > WORKER_STALE_MS) {
          actorLog("warn", this.id, `Worker ${actorId} (${status.role}) stale for ${Math.round(sinceLast / 1000)}s`, this.traceId);
          const ping = createMessage("heartbeat_ping", this.id, actorId, {});
          this.config.system.send(ping);
        }

        // Worker has been running for too long — notify client
        if (elapsed > WORKER_LONG_RUNNING_MS) {
          try {
            await this.config.sendEvent({
              statusUpdate: `${status.role} 已執行 ${Math.round(elapsed / 60000)} 分鐘...`,
              agentRole: "pm",
            });
          } catch { /* stream may have closed */ }
        }
      }
    }, STATUS_CHECK_INTERVAL_MS);
  }

  private registerWorker(actorId: string, role: AgentRole): void {
    this.workerStatusTracker.set(actorId, {
      role,
      actorId,
      dispatchedAt: Date.now(),
      lastHeartbeat: Date.now(),
      status: "running",
      retryCount: 0,
    });
  }

  private markWorkerComplete(actorId: string): void {
    const status = this.workerStatusTracker.get(actorId);
    if (status) {
      status.status = "completed";
      status.lastHeartbeat = Date.now();
    }
  }

  /** Build peer registry from currently active workers */
  private buildPeerRegistry(): Map<AgentRole, string> {
    const registry = new Map<AgentRole, string>();
    for (const [actorId, status] of this.workerStatusTracker) {
      if (status.status === "running") {
        registry.set(status.role, actorId);
      }
    }
    return registry;
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

  // ---- Agent Result (task_result — backward compatible) ----

  private async handleAgentResult(message: ActorMessage & { type: "task_result" }): Promise<ActorMessage | null> {
    const payload = message.payload;
    const { sendEvent, saveArtifact } = this.config;

    // Mark worker as complete
    this.markWorkerComplete(message.from);

    // Save artifact
    await saveArtifact(payload.agentRole, payload.content);

    // Delegate post-processing (file ops + service binding)
    // Wrapped in try/catch to prevent post-processing failures from killing the PM actor
    try {
      await this.postProcessor.process(payload.content);
    } catch (ppErr) {
      actorLog("warn", this.id, `Post-processing failed (non-fatal): ${ppErr instanceof Error ? ppErr.message : ppErr}`, this.traceId);
    }

    // Update state
    this.orchState = stateForAgentComplete(
      this.orchState,
      payload.agentRole,
      payload.summary
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
    this.markWorkerComplete(message.from);

    // Save artifact
    await saveArtifact(payload.agentRole, payload.content);

    // Delegate post-processing
    // Wrapped in try/catch to prevent post-processing failures from killing the PM actor
    try {
      await this.postProcessor.process(payload.content);
    } catch (ppErr) {
      actorLog("warn", this.id, `Post-processing failed (non-fatal): ${ppErr instanceof Error ? ppErr.message : ppErr}`, this.traceId);
    }

    // Update state
    this.orchState = stateForAgentComplete(
      this.orchState,
      payload.agentRole,
      payload.summary
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

  // ---- Parallel Result ----

  private async handleParallelResult(message: ActorMessage & { type: "parallel_result" }): Promise<ActorMessage | null> {
    const payload = message.payload;
    const { saveArtifact } = this.config;

    // Mark worker as complete
    this.markWorkerComplete(message.from);

    // Save artifact with actor/task IDs
    await saveArtifact(payload.agentRole, payload.content, payload.actorId, payload.taskId);

    // Collect result
    this.pendingParallelResults.set(payload.taskId, payload);

    // Check if all parallel results are in
    if (this.pendingParallelResults.size >= this.expectedParallelCount) {
      await this.mergeAndContinue();
    }

    return null;
  }

  // ---- Agent Error (with deterministic recovery) ----

  private async handleAgentError(message: ActorMessage & { type: "error" }): Promise<ActorMessage | null> {
    const payload = message.payload;
    const { sendEvent } = this.config;

    // Mark worker as error
    const workerStatus = this.workerStatusTracker.get(payload.actorId);
    if (workerStatus) {
      workerStatus.status = "error";
    }

    actorLog("warn", this.id, `Agent error: ${payload.agentRole} (${payload.errorType}): ${payload.error}`, this.traceId);

    // If we're in parallel mode, treat failed worker as a completed result with error
    if (this.expectedParallelCount > 0 && this.currentGroupId) {
      actorLog("warn", this.id, `Parallel worker ${payload.actorId} failed — injecting error result`, this.traceId);
      this.pendingParallelResults.set(payload.actorId, {
        groupId: this.currentGroupId,
        taskId: payload.actorId,
        agentRole: payload.agentRole,
        actorId: payload.actorId,
        content: `\`\`\`json\n{"status": "blocked", "blockedReason": "${payload.error}"}\n\`\`\``,
        summary: `Failed: ${payload.error}`,
        blocked: true,
        blockedReason: payload.error,
      } as ParallelResultPayload);

      await sendEvent({
        parallelActorStatus: {
          actorId: payload.actorId,
          taskId: payload.actorId,
          groupId: this.currentGroupId,
          status: "error",
          agentRole: payload.agentRole,
          error: payload.error,
        },
      });

      // Check if all parallel results (including errors) are collected
      if (this.pendingParallelResults.size >= this.expectedParallelCount) {
        await this.mergeAndContinue();
      }
      return null;
    }

    // Deterministic recovery based on error type
    switch (payload.errorType) {
      case "rate_limit": {
        const retryCount = workerStatus?.retryCount ?? 0;
        const backoffMs = calculateBackoff(retryCount);
        if (workerStatus) workerStatus.retryCount = retryCount + 1;
        actorLog("info", this.id, `Rate limit hit, backing off ${backoffMs}ms (attempt ${retryCount + 1})`, this.traceId);
        await sendEvent({ statusUpdate: "遇到速率限制，稍後重試...", agentRole: "pm" });
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
        await sendEvent({ statusUpdate: "API 逾時，正在重新安排任務...", agentRole: "pm" });
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

      // Progress updates while PM generates
      let progressIdx = 0;
      const progressTimer = setInterval(async () => {
        const msg = PM_PROGRESS_MESSAGES[Math.min(progressIdx, PM_PROGRESS_MESSAGES.length - 1)];
        progressIdx++;
        try {
          await sendEvent({ statusUpdate: msg, agentRole: "pm" });
        } catch { /* stream may have closed */ }
      }, PROGRESS_INTERVAL_MS);
      this.activeTimers.add(progressTimer);

      const pmModel = getModelForAgent("pm", this.config.model);
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

      // ---- Handle dispatch ----
      if (pmAction?.action === "dispatch") {
        // No message to user — internal orchestration
        await sendEvent({
          agentComplete: true,
          agentRole: "pm",
          rawContent: result.content,
          orchestrationState: this.orchState,
        });

        // Dispatch to specialist
        await this.dispatchSingle(pmAction.target, pmAction.task);
        return; // Wait for specialist result (will re-enter via handleAgentResult)
      }

      // ---- Handle dispatch_parallel ----
      if (pmAction?.action === "dispatch_parallel") {
        // No message to user — internal orchestration
        await sendEvent({
          agentComplete: true,
          agentRole: "pm",
          rawContent: result.content,
          orchestrationState: this.orchState,
        });

        // Dispatch parallel developers
        await this.dispatchParallel(
          (pmAction as { tasks: Array<{ taskId: string; task: string; files: string[] }> }).tasks
        );
        return; // Wait for all parallel results
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

  // ---- Dispatch Helpers ----

  private async dispatchSingle(target: AgentRole, task: string): Promise<void> {
    const { system } = this.config;

    // Update orchestration state
    this.orchState = stateForDispatch(this.orchState, target, task);

    // Build peer registry from active workers
    const peerRegistry = this.buildPeerRegistry();

    // Create specialist config
    const specialistConfig: SpecialistConfig = {
      model: this.config.model,
      serviceInstances: this.config.serviceInstances,
      appContext: this.config.appContext,
      sendEvent: this.config.sendEvent,
      locale: this.config.locale,
      peerRegistry,
      conversationId: this.config.conversationId,
      backgroundSystem: this.config.backgroundSystem,
    };

    // Create and spawn specialist actor
    const specialist = createSpecialistActor(target, 0, specialistConfig);
    await system.spawn(specialist);

    // Register worker for status tracking
    this.registerWorker(specialist.id, target);

    // Update peer registry for all active workers (they now have a new peer)
    // Note: existing actors won't see the updated registry until next dispatch,
    // but new actors will have the full picture

    // Send agent metadata
    await this.config.sendEvent({
      agentRole: target,
      orchestrationState: this.orchState,
    });

    // Send task to specialist
    const taskMsg = createMessage("task", this.id, specialist.id, {
      task,
      context: this.config.artifactContext,
      messages: this.messages.map((m) => ({
        role: m.role,
        content: m.content,
        agentRole: m.agentRole,
      })),
    } satisfies TaskPayload);

    system.send(taskMsg);
  }

  private async dispatchParallel(
    tasks: Array<{ taskId: string; task: string; files: string[] }>
  ): Promise<void> {
    const { system, sendEvent } = this.config;

    const groupId = `parallel-${Date.now()}`;
    this.currentGroupId = groupId;
    this.expectedParallelCount = tasks.length;
    this.pendingParallelResults.clear();

    // Clear any previous parallel timeout
    if (this.parallelTimeout) {
      clearTimeout(this.parallelTimeout);
    }

    // Set timeout for parallel collection — force merge with whatever results we have
    this.parallelTimeout = setTimeout(async () => {
      if (this.expectedParallelCount > 0 && this.pendingParallelResults.size < this.expectedParallelCount) {
        actorLog("warn", this.id, `Parallel timeout: only ${this.pendingParallelResults.size}/${this.expectedParallelCount} results collected — forcing merge`, this.traceId);
        await sendEvent({
          statusUpdate: `部分開發者逾時（已收到 ${this.pendingParallelResults.size}/${this.expectedParallelCount} 個結果），正在合併已完成的工作...`,
          agentRole: "pm",
        });
        await this.mergeAndContinue();
      }
    }, PMActor.PARALLEL_TIMEOUT_MS);

    // Send parallel group event
    await sendEvent({
      parallelGroup: {
        groupId,
        tasks: tasks.map((t, i) => ({
          taskId: t.taskId,
          actorId: `developer-${i}`,
          agentRole: "developer" as const,
          status: "running" as const,
          description: t.task.slice(0, 100),
        })),
      },
    });

    // Create specialist config with background system access
    const specialistConfig: SpecialistConfig = {
      model: this.config.model,
      serviceInstances: this.config.serviceInstances,
      appContext: this.config.appContext,
      sendEvent: this.config.sendEvent,
      locale: this.config.locale,
      conversationId: this.config.conversationId,
      backgroundSystem: this.config.backgroundSystem,
    };

    // Spawn all developers and dispatch tasks concurrently
    for (let index = 0; index < tasks.length; index++) {
      const task = tasks[index];

      // Update state for each developer
      this.orchState = stateForDispatch(
        this.orchState,
        "developer",
        `[${task.taskId}] ${task.task.slice(0, 80)}`
      );
      // Set actorId on the last task
      const lastTask = this.orchState.tasks[this.orchState.tasks.length - 1];
      if (lastTask) lastTask.actorId = `developer-${index}`;

      const developer = createSpecialistActor("developer", index, specialistConfig);
      await system.spawn(developer);

      // Register worker for status tracking
      this.registerWorker(developer.id, "developer");

      const parallelMsg = createMessage("parallel_task", this.id, developer.id, {
        groupId,
        taskId: task.taskId,
        task: task.task,
        files: task.files,
        context: this.config.artifactContext,
        messages: this.messages.map((m) => ({
          role: m.role,
          content: m.content,
          agentRole: m.agentRole,
        })),
      } satisfies ParallelTaskPayload);

      system.send(parallelMsg);
    }
  }

  // ---- Merge Parallel Results ----

  private async mergeAndContinue(): Promise<void> {
    // Guard: prevent double-merge (timeout vs normal completion race)
    if (this.expectedParallelCount === 0) return;

    const { sendEvent, saveArtifact } = this.config;

    // Clear parallel timeout
    if (this.parallelTimeout) {
      clearTimeout(this.parallelTimeout);
      this.parallelTimeout = null;
    }

    // Merge all developer outputs (with conflict detection)
    const { content: mergedContent, mergeResult } = this.mergeParallelResults();

    // Report conflicts via SSE if any
    if (mergeResult.conflicts.length > 0) {
      await sendEvent({
        mergeConflicts: mergeResult.conflicts.map((c) => ({
          path: c.path,
          sources: c.sources.map((s) => s.taskId),
        })),
        agentRole: "developer",
      });
    }

    // Update state for each completed developer
    for (const [, result] of this.pendingParallelResults) {
      this.markWorkerComplete(result.actorId);
      this.orchState = stateForAgentComplete(
        this.orchState,
        "developer",
        result.summary
      );
    }

    // Send merged completion
    await sendEvent({
      agentComplete: true,
      agentRole: "developer",
      orchestrationState: this.orchState,
    });

    // Translate merged result
    const translated = await translateForUser(mergedContent, "developer", this.config.locale);
    const displayContent = translated.content || stripJsonBlocks(mergedContent) || "所有開發者已完成工作。";
    await sendEvent({ content: displayContent, agentRole: "developer" });
    if (translated.usage) {
      await sendEvent({ usage: translated.usage, model: getOutputModel() });
    }

    // Add merged result to message history
    this.messages.push({
      role: "assistant",
      content: mergedContent,
      agentRole: "developer",
    });

    // Save merged artifact
    await saveArtifact("developer", mergedContent);

    // Delegate post-processing (file ops + service binding)
    await this.postProcessor.process(mergedContent);

    // Reset parallel tracking
    this.pendingParallelResults.clear();
    this.expectedParallelCount = 0;
    this.currentGroupId = null;

    // Continue PM loop
    await this.runPMLoop();
  }

  private mergeParallelResults(): { content: string; mergeResult: MergeResult } {
    const outputs = Array.from(this.pendingParallelResults.entries()).map(
      ([taskId, result]) => ({ taskId, content: result.content }),
    );

    const mergeResult = mergeParallelOutputs(outputs);

    // Log conflicts if any
    if (mergeResult.conflicts.length > 0) {
      actorLog(
        "warn",
        this.id,
        `Parallel merge conflicts: ${mergeResult.conflicts.map((c) => c.path).join(", ")}`,
        this.traceId,
      );
    }

    const content = mergeResultToContent(mergeResult);
    return { content, mergeResult };
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
    const displayContent =
      translated.content ||
      stripJsonBlocks(content) ||
      getFallbackMessage(action);

    if (translated.usage) {
      await sendEvent({ usage: translated.usage, model: getOutputModel() });
    }

    return displayContent;
  }
}
