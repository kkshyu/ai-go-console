/**
 * Workflow Runner
 *
 * Extracted from PMActor. Handles the execution side of orchestration:
 * - Single agent dispatch
 * - Parallel developer dispatch + merge
 * - DAG execution
 * - Worker status tracking
 *
 * PM actor retains: LLM decision loop, message history, orchestration state ownership.
 * WorkflowRunner operates on state via callbacks — it does not own the state.
 */

import type { AgentRole, ExecutionDAG } from "../agents/types";
import type { OrchestrationState } from "../agents/types";
import type { ActorMessage, ParallelResultPayload, TaskPayload, ParallelTaskPayload } from "./types";
import { createMessage } from "./types";
import type { ActorSystem } from "./actor-system";
import { DAGExecutor, type DAGExecutorConfig } from "./dag-executor";
import { Blackboard } from "./blackboard";
import { EventBus } from "./event-bus";
import { createSpecialistActor, type SpecialistConfig } from "./specialist-actors";
import { PostProcessor, type PostProcessorConfig } from "./post-processor";
import { stateForDispatch, stateForAgentComplete } from "../agents/orchestrator";
import { translateForUser, stripJsonBlocks, getOutputModel } from "../ai";
import { mergeParallelOutputs, mergeResultToContent, type MergeResult } from "../services/parallel-merge";
import { actorLog } from "./logger";
import {
  getPartialTimeoutMessage,
  getAllDevelopersDoneMessage,
  getWorkerLongRunningMessage,
} from "../../i18n/pm-messages";

/** Worker stale threshold (no heartbeat) */
const WORKER_STALE_MS = 60_000;
/** Worker long-running threshold */
const WORKER_LONG_RUNNING_MS = 180_000;
/** Status check interval */
const STATUS_CHECK_INTERVAL_MS = 30_000;

interface WorkerStatus {
  role: AgentRole;
  actorId: string;
  dispatchedAt: number;
  lastHeartbeat: number;
  status: "running" | "completed" | "error";
  retryCount: number;
}

export interface WorkflowRunnerConfig {
  model: string;
  serviceInstances: Array<{ id: string; name: string; type: string; status?: "ok" | "failed" | "untested"; message?: string }>;
  appContext?: string;
  artifactContext: string;
  fileContext?: string;
  sendEvent: (data: unknown) => Promise<void>;
  saveArtifact: (agentRole: AgentRole, content: string, actorId?: string, taskId?: string) => Promise<void>;
  system: ActorSystem;
  locale?: string;
  conversationId?: string;
  backgroundSystem?: import("./background-system").BackgroundActorSystem;
  orgModelConfigs?: Array<{ agentRole: string; modelId: string }>;
  appSlug?: string;
  appId?: string;
  userId?: string;
  orgSlug?: string;
}

/**
 * Callbacks that the WorkflowRunner uses to interact with PM state.
 * PM actor provides these — WorkflowRunner never modifies PM state directly.
 */
export interface WorkflowCallbacks {
  /** Get current orchestration state */
  getOrchState: () => OrchestrationState;
  /** Set orchestration state */
  setOrchState: (state: OrchestrationState) => void;
  /** Get current messages */
  getMessages: () => Array<{ role: string; content: string; agentRole?: string }>;
  /** Add a message to history */
  addMessage: (msg: { role: "user" | "assistant"; content: string; agentRole?: AgentRole }) => void;
  /** Continue PM decision loop after workflow completes */
  continueLoop: () => Promise<void>;
  /** The PM actor ID (for message routing) */
  pmActorId: string;
  /** Trace ID for logging */
  traceId?: string;
}

export class WorkflowRunner {
  private config: WorkflowRunnerConfig;
  private callbacks: WorkflowCallbacks;
  private postProcessor: PostProcessor;

  // Parallel execution tracking
  private pendingParallelResults: Map<string, ParallelResultPayload> = new Map();
  private expectedParallelCount = 0;
  private currentGroupId: string | null = null;
  private parallelTimeout: ReturnType<typeof setTimeout> | null = null;
  private actorToTaskId: Map<string, string> = new Map();

  // DAG execution tracking
  private activeDAGExecutor: DAGExecutor | null = null;
  private dagActorIds: Set<string> = new Set();

  // Worker status tracking
  private workerStatusTracker: Map<string, WorkerStatus> = new Map();
  private statusCheckTimer: ReturnType<typeof setInterval> | null = null;

  /** Timeout for collecting all parallel results (3 minutes). */
  private static readonly PARALLEL_TIMEOUT_MS = 3 * 60 * 1000;

  constructor(config: WorkflowRunnerConfig, callbacks: WorkflowCallbacks) {
    this.config = config;
    this.callbacks = callbacks;

    const ppConfig: PostProcessorConfig = {
      appSlug: config.appSlug,
      appId: config.appId,
      userId: config.userId,
      orgSlug: config.orgSlug,
      serviceInstances: config.serviceInstances,
      sendEvent: config.sendEvent,
      traceId: callbacks.traceId,
    };
    this.postProcessor = new PostProcessor(ppConfig);
  }

  // ---- Worker Status Tracking ----

  startStatusTracking(): void {
    this.statusCheckTimer = setInterval(async () => {
      const now = Date.now();
      for (const [actorId, status] of this.workerStatusTracker) {
        if (status.status !== "running") continue;

        const elapsed = now - status.dispatchedAt;
        const sinceLast = now - status.lastHeartbeat;

        if (sinceLast > WORKER_STALE_MS) {
          actorLog("warn", this.callbacks.pmActorId, `Worker ${actorId} (${status.role}) stale for ${Math.round(sinceLast / 1000)}s`, this.callbacks.traceId);
          const ping = createMessage("heartbeat_ping", this.callbacks.pmActorId, actorId, {});
          this.config.system.send(ping);
        }

        if (elapsed > WORKER_LONG_RUNNING_MS) {
          try {
            await this.config.sendEvent({
              statusUpdate: getWorkerLongRunningMessage(status.role, Math.round(elapsed / 60000), this.config.locale),
              agentRole: "pm",
            });
          } catch { /* stream may have closed */ }
        }
      }
    }, STATUS_CHECK_INTERVAL_MS);
  }

  registerWorker(actorId: string, role: AgentRole): void {
    this.workerStatusTracker.set(actorId, {
      role,
      actorId,
      dispatchedAt: Date.now(),
      lastHeartbeat: Date.now(),
      status: "running",
      retryCount: 0,
    });
  }

  markWorkerComplete(actorId: string): void {
    const status = this.workerStatusTracker.get(actorId);
    if (status) {
      status.status = "completed";
      status.lastHeartbeat = Date.now();
    }
  }

  markWorkerError(actorId: string): void {
    const status = this.workerStatusTracker.get(actorId);
    if (status) {
      status.status = "error";
    }
  }

  getWorkerStatus(actorId: string): WorkerStatus | undefined {
    return this.workerStatusTracker.get(actorId);
  }

  /** Build peer registry from currently active workers */
  buildPeerRegistry(): Map<AgentRole, string> {
    const registry = new Map<AgentRole, string>();
    for (const [actorId, status] of this.workerStatusTracker) {
      if (status.status === "running") {
        registry.set(status.role, actorId);
      }
    }
    return registry;
  }

  // ---- Dispatch Helpers ----

  async dispatchSingle(target: AgentRole, task: string): Promise<void> {
    const { system } = this.config;

    this.callbacks.setOrchState(
      stateForDispatch(this.callbacks.getOrchState(), target, task),
    );

    const peerRegistry = this.buildPeerRegistry();

    const specialistConfig: SpecialistConfig = {
      model: this.config.model,
      serviceInstances: this.config.serviceInstances,
      appContext: this.config.appContext,
      sendEvent: this.config.sendEvent,
      locale: this.config.locale,
      peerRegistry,
      conversationId: this.config.conversationId,
      backgroundSystem: this.config.backgroundSystem,
      system: this.config.system,
    };

    const specialist = createSpecialistActor(target, 0, specialistConfig);
    await system.spawn(specialist);

    this.registerWorker(specialist.id, target);

    await this.config.sendEvent({
      agentRole: target,
      orchestrationState: this.callbacks.getOrchState(),
    });

    const taskMsg = createMessage("task", this.callbacks.pmActorId, specialist.id, {
      task,
      context: this.config.artifactContext,
      messages: this.callbacks.getMessages().map((m) => ({
        role: m.role,
        content: m.content,
        agentRole: m.agentRole,
      })),
    } satisfies TaskPayload);

    system.send(taskMsg);
  }

  async dispatchParallel(
    tasks: Array<{ taskId: string; task: string; files: string[] }>,
  ): Promise<void> {
    const { system, sendEvent } = this.config;

    const groupId = `parallel-${Date.now()}`;
    this.currentGroupId = groupId;
    this.expectedParallelCount = tasks.length;
    this.pendingParallelResults.clear();

    if (this.parallelTimeout) {
      clearTimeout(this.parallelTimeout);
    }

    this.parallelTimeout = setTimeout(async () => {
      if (this.expectedParallelCount > 0 && this.pendingParallelResults.size < this.expectedParallelCount) {
        actorLog("warn", this.callbacks.pmActorId, `Parallel timeout: only ${this.pendingParallelResults.size}/${this.expectedParallelCount} results collected — forcing merge`, this.callbacks.traceId);
        await sendEvent({
          statusUpdate: getPartialTimeoutMessage(this.pendingParallelResults.size, this.expectedParallelCount, this.config.locale),
          agentRole: "pm",
        });
        await this.mergeAndContinue();
      }
    }, WorkflowRunner.PARALLEL_TIMEOUT_MS);

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

    const specialistConfig: SpecialistConfig = {
      model: this.config.model,
      serviceInstances: this.config.serviceInstances,
      appContext: this.config.appContext,
      sendEvent: this.config.sendEvent,
      locale: this.config.locale,
      conversationId: this.config.conversationId,
      backgroundSystem: this.config.backgroundSystem,
      system: this.config.system,
    };

    for (let index = 0; index < tasks.length; index++) {
      const task = tasks[index];

      let orchState = this.callbacks.getOrchState();
      orchState = stateForDispatch(orchState, "developer", `[${task.taskId}] ${task.task.slice(0, 80)}`);
      const lastTask = orchState.tasks[orchState.tasks.length - 1];
      if (lastTask) lastTask.actorId = `developer-${index}`;
      this.callbacks.setOrchState(orchState);

      const developer = createSpecialistActor("developer", index, specialistConfig);
      await system.spawn(developer);

      this.registerWorker(developer.id, "developer");
      this.actorToTaskId.set(developer.id, task.taskId);

      const parallelMsg = createMessage("parallel_task", this.callbacks.pmActorId, developer.id, {
        groupId,
        taskId: task.taskId,
        task: task.task,
        files: task.files,
        context: this.config.artifactContext,
        messages: this.callbacks.getMessages().map((m) => ({
          role: m.role,
          content: m.content,
          agentRole: m.agentRole,
        })),
      } satisfies ParallelTaskPayload);

      system.send(parallelMsg);
    }
  }

  async executeDAG(dag: ExecutionDAG): Promise<void> {
    const { system, sendEvent, saveArtifact } = this.config;

    const specialistConfig: SpecialistConfig = {
      model: this.config.model,
      serviceInstances: this.config.serviceInstances,
      appContext: this.config.appContext,
      sendEvent: this.config.sendEvent,
      locale: this.config.locale,
      conversationId: this.config.conversationId,
      backgroundSystem: this.config.backgroundSystem,
      system: this.config.system,
    };

    const blackboard = new Blackboard();
    const eventBus = new EventBus();

    this.dagActorIds.clear();

    const dagConfig: DAGExecutorConfig = {
      system,
      blackboard,
      eventBus,
      sendEvent,
      createAgent: (role, index) => {
        const agent = createSpecialistActor(role, index, specialistConfig);
        this.dagActorIds.add(agent.id);
        this.registerWorker(agent.id, role);
        return agent;
      },
      artifactContext: this.config.artifactContext,
      fileContext: this.config.fileContext,
      messages: this.callbacks.getMessages().map((m) => ({
        role: m.role,
        content: m.content,
        agentRole: m.agentRole,
      })),
      saveArtifact,
      traceId: this.callbacks.traceId,
      pmActorId: this.callbacks.pmActorId,
    };

    const executor = new DAGExecutor(dagConfig);
    this.activeDAGExecutor = executor;

    try {
      const dagState = await executor.execute(dag);

      const dagSummary = dagState.tasks
        .map((t) => `[${t.agentRole}] ${t.summary || t.description || "completed"}`)
        .join("\n");

      this.callbacks.addMessage({
        role: "assistant",
        content: `[DAG EXECUTION COMPLETE]\n${dagSummary}`,
        agentRole: "pm",
      });

      const orchState = this.callbacks.getOrchState();
      this.callbacks.setOrchState({
        ...orchState,
        tasks: [...orchState.tasks, ...dagState.tasks],
      });

      await sendEvent({
        dagComplete: true,
        orchestrationState: this.callbacks.getOrchState(),
      });

      // Post-process each successful task
      for (const task of dagState.tasks) {
        if (task.status === "completed") {
          const output = blackboard.get<string>(`${task.agentRole}_output`);
          if (output) {
            try {
              await this.postProcessor.process(output);
            } catch (ppErr) {
              actorLog("warn", this.callbacks.pmActorId, `DAG post-processing failed for ${task.agentRole}: ${ppErr instanceof Error ? ppErr.message : ppErr}`, this.callbacks.traceId);
            }
          }
        }
      }

      await this.callbacks.continueLoop();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown DAG error";
      actorLog("error", this.callbacks.pmActorId, `DAG execution failed: ${errMsg}`, this.callbacks.traceId);
      await sendEvent({ error: `DAG execution failed: ${errMsg}` });

      this.callbacks.addMessage({
        role: "assistant",
        content: `[DAG EXECUTION FAILED]: ${errMsg}`,
        agentRole: "pm",
      });

      await this.callbacks.continueLoop();
    } finally {
      this.activeDAGExecutor = null;
      this.dagActorIds.clear();
      eventBus.clear();
      blackboard.clear();
    }
  }

  // ---- Message Handlers (called by PM actor) ----

  /**
   * Handle a task_result that might be DAG-routed.
   * Returns true if this was a DAG result and was handled.
   */
  handleDAGResult(payload: { dagNodeId?: string; content: string; summary: string; blocked: boolean; agentRole: AgentRole }, actorId: string): boolean {
    if (payload.dagNodeId && this.activeDAGExecutor) {
      actorLog("info", this.callbacks.pmActorId, `DAG node ${payload.dagNodeId} completed via ${actorId}`, this.callbacks.traceId);
      this.markWorkerComplete(actorId);
      this.activeDAGExecutor.notifyNodeComplete(
        payload.dagNodeId,
        payload.content,
        payload.summary,
        !payload.blocked,
      );
      return true;
    }
    return false;
  }

  /**
   * Handle an error that might be from a DAG-spawned actor.
   * Returns true if handled.
   */
  handleDAGError(actorId: string, error: string): boolean {
    if (this.activeDAGExecutor && this.dagActorIds.has(actorId)) {
      const nodeId = this.activeDAGExecutor.resolveNodeId(actorId);
      if (nodeId) {
        actorLog("warn", this.callbacks.pmActorId, `DAG node ${nodeId} (actor ${actorId}) error: ${error}`, this.callbacks.traceId);
        this.activeDAGExecutor.notifyNodeError(nodeId, error);
      }
      return true;
    }
    return false;
  }

  /**
   * Handle a parallel result from a developer.
   */
  async handleParallelResult(payload: ParallelResultPayload, actorId: string): Promise<void> {
    this.markWorkerComplete(actorId);
    await this.config.saveArtifact(payload.agentRole, payload.content, payload.actorId, payload.taskId);

    // Post-process individual worker result
    try {
      await this.postProcessor.process(payload.content);
    } catch (ppErr) {
      actorLog("warn", this.callbacks.pmActorId, `Parallel worker ${payload.actorId} post-processing failed (non-fatal): ${ppErr instanceof Error ? ppErr.message : ppErr}`, this.callbacks.traceId);
    }

    this.pendingParallelResults.set(payload.taskId, payload);

    if (this.pendingParallelResults.size >= this.expectedParallelCount) {
      await this.mergeAndContinue();
    }
  }

  /**
   * Handle a parallel worker error by injecting an error result.
   */
  async handleParallelError(actorId: string, agentRole: AgentRole, error: string): Promise<void> {
    const resolvedTaskId = this.actorToTaskId.get(actorId) || actorId;
    actorLog("warn", this.callbacks.pmActorId, `Parallel worker ${actorId} (task: ${resolvedTaskId}) failed — injecting error result`, this.callbacks.traceId);

    this.pendingParallelResults.set(resolvedTaskId, {
      groupId: this.currentGroupId!,
      taskId: resolvedTaskId,
      agentRole,
      actorId,
      content: `\`\`\`json\n{"status": "blocked", "blockedReason": "${error}"}\n\`\`\``,
      summary: `Failed: ${error}`,
      blocked: true,
      blockedReason: error,
    } as ParallelResultPayload);

    await this.config.sendEvent({
      parallelActorStatus: {
        actorId,
        taskId: resolvedTaskId,
        groupId: this.currentGroupId,
        status: "error",
        agentRole,
        error,
      },
    });

    if (this.pendingParallelResults.size >= this.expectedParallelCount) {
      await this.mergeAndContinue();
    }
  }

  /** Post-process content (delegated from PM for non-workflow results). */
  async postProcess(content: string): Promise<void> {
    await this.postProcessor.process(content);
  }

  // ---- Parallel Merge ----

  private async mergeAndContinue(): Promise<void> {
    if (this.expectedParallelCount === 0) return;

    const { sendEvent, saveArtifact } = this.config;

    if (this.parallelTimeout) {
      clearTimeout(this.parallelTimeout);
      this.parallelTimeout = null;
    }

    const { content: mergedContent, mergeResult } = this.mergeParallelResults();

    if (mergeResult.conflicts.length > 0) {
      await sendEvent({
        mergeConflicts: mergeResult.conflicts.map((c) => ({
          path: c.path,
          sources: c.sources.map((s) => s.taskId),
        })),
        agentRole: "developer",
      });
    }

    for (const [, result] of this.pendingParallelResults) {
      this.markWorkerComplete(result.actorId);
      this.callbacks.setOrchState(
        stateForAgentComplete(
          this.callbacks.getOrchState(),
          "developer",
          result.summary,
          result.actorId,
        ),
      );
    }

    await sendEvent({
      agentComplete: true,
      agentRole: "developer",
      orchestrationState: this.callbacks.getOrchState(),
    });

    const translated = await translateForUser(mergedContent, "developer", this.config.locale);
    const displayContent = translated.content || stripJsonBlocks(mergedContent) || getAllDevelopersDoneMessage(this.config.locale);
    await sendEvent({ content: displayContent, agentRole: "developer" });
    if (translated.usage) {
      await sendEvent({ usage: translated.usage, model: getOutputModel() });
    }

    this.callbacks.addMessage({
      role: "assistant",
      content: mergedContent,
      agentRole: "developer",
    });

    await saveArtifact("developer", mergedContent);

    // Post-process merged result (individual workers already post-processed)
    try {
      await this.postProcessor.process(mergedContent);
    } catch (ppErr) {
      actorLog("warn", this.callbacks.pmActorId, `Merge post-processing failed (non-fatal): ${ppErr instanceof Error ? ppErr.message : ppErr}`, this.callbacks.traceId);
    }

    // Reset parallel tracking
    this.pendingParallelResults.clear();
    this.expectedParallelCount = 0;
    this.currentGroupId = null;
    this.actorToTaskId.clear();

    await this.callbacks.continueLoop();
  }

  private mergeParallelResults(): { content: string; mergeResult: MergeResult } {
    const outputs = Array.from(this.pendingParallelResults.entries()).map(
      ([taskId, result]) => ({ taskId, content: result.content }),
    );

    const mergeResult = mergeParallelOutputs(outputs);

    if (mergeResult.conflicts.length > 0) {
      actorLog(
        "warn",
        this.callbacks.pmActorId,
        `Parallel merge conflicts: ${mergeResult.conflicts.map((c) => c.path).join(", ")}`,
        this.callbacks.traceId,
      );
    }

    const content = mergeResultToContent(mergeResult);
    return { content, mergeResult };
  }

  // ---- Accessors ----

  get isInParallelMode(): boolean {
    return this.expectedParallelCount > 0 && this.currentGroupId !== null;
  }

  resolveTaskIdFromActor(actorId: string): string {
    return this.actorToTaskId.get(actorId) || actorId;
  }

  // ---- Cleanup ----

  stop(): void {
    if (this.parallelTimeout) {
      clearTimeout(this.parallelTimeout);
      this.parallelTimeout = null;
    }
    if (this.statusCheckTimer) {
      clearInterval(this.statusCheckTimer);
      this.statusCheckTimer = null;
    }
    this.pendingParallelResults.clear();
    this.expectedParallelCount = 0;
    this.activeDAGExecutor = null;
    this.dagActorIds.clear();
  }
}
