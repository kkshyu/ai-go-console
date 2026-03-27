/**
 * PM Agent Actor
 *
 * The PM (Product Manager) is the central orchestrator in the actor system.
 * It receives user messages, runs LLM to decide actions, dispatches to
 * specialist actors, handles parallel developer coordination, and monitors
 * all agents via the actor system's heartbeat.
 */

import { Actor } from "./actor";
import { ActorSystem } from "./actor-system";
import type {
  ActorMessage,
  TaskPayload,
  TaskResultPayload,
  ParallelResultPayload,
  ErrorPayload,
} from "./types";
import { createMessage } from "./types";
import {
  streamChat,
  translateForUser,
  stripJsonBlocks,
  type ChatMessage,
  type TokenUsage,
  DEFAULT_MODEL,
  OUTPUT_MODEL,
} from "../ai";
import type { AgentRole, OrchestrationState, AgentMessage as AgentMsg } from "../agents/types";
import { createInitialOrchestrationState } from "../agents/types";
import {
  parsePMAction,
  stateForDispatch,
  stateForAgentComplete,
  stateForComplete,
} from "../agents/orchestrator";
import { createSpecialistActor, type SpecialistConfig } from "./specialist-actors";
import { writeFiles } from "../docker-sandbox";

/** Maximum number of agent interactions per request. */
const MAX_INTERACTIONS = 20;

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

export interface PMActorConfig {
  model: string;
  allowedServices: string[];
  serviceInstances: Array<{ id: string; name: string; type: string }>;
  appContext?: string;
  artifactContext: string;
  sendEvent: (data: unknown) => Promise<void>;
  saveArtifact: (agentRole: AgentRole, content: string, actorId?: string, taskId?: string) => Promise<void>;
  system: ActorSystem;
  pmPrompt: string;
  appSlug?: string;
}

export class PMActor extends Actor {
  private config: PMActorConfig;
  private orchState: OrchestrationState;
  private interactionCount = 0;
  private messages: AgentMsg[] = [];

  // Parallel execution tracking
  private pendingParallelResults: Map<string, ParallelResultPayload> = new Map();
  private expectedParallelCount = 0;
  private currentGroupId: string | null = null;

  // Timer tracking for GC
  private activeTimers: Set<ReturnType<typeof setInterval>> = new Set();

  constructor(config: PMActorConfig, initialState?: OrchestrationState) {
    super("pm-0", "pm");
    this.config = config;
    this.orchState = initialState || createInitialOrchestrationState();
  }

  async onStart(): Promise<void> {
    // PM is ready
  }

  onStop(): void {
    for (const timer of this.activeTimers) {
      clearInterval(timer);
    }
    this.activeTimers.clear();
  }

  async onRestart(error: Error): Promise<void> {
    console.warn(`[PMActor] Restarting after error: ${error.message}`);
  }

  async onReceive(message: ActorMessage): Promise<ActorMessage | null> {
    switch (message.type) {
      case "task":
        return this.handleUserMessage(message);
      case "task_result":
        return this.handleAgentResult(message);
      case "parallel_result":
        return this.handleParallelResult(message);
      case "error":
        return this.handleAgentError(message);
      default:
        return null;
    }
  }

  // ---- User Message ----

  private async handleUserMessage(message: ActorMessage): Promise<ActorMessage | null> {
    const payload = message.payload as TaskPayload;

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

  // ---- Agent Result ----

  private async handleAgentResult(message: ActorMessage): Promise<ActorMessage | null> {
    const payload = message.payload as TaskResultPayload;
    const { sendEvent, saveArtifact } = this.config;

    // Save artifact
    await saveArtifact(payload.agentRole, payload.content);

    // Directly write files to Docker container if applicable
    await this.executeFileOperations(payload.content);

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

  // ---- Parallel Result ----

  private async handleParallelResult(message: ActorMessage): Promise<ActorMessage | null> {
    const payload = message.payload as ParallelResultPayload;
    const { saveArtifact } = this.config;

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

  // ---- Agent Error ----

  private async handleAgentError(message: ActorMessage): Promise<ActorMessage | null> {
    const payload = message.payload as ErrorPayload;
    const { sendEvent } = this.config;

    await sendEvent({
      error: `Agent ${payload.agentRole} failed permanently: ${payload.error}`,
    });

    // Add blocked message to history so PM can handle it
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

  // ---- PM Decision Loop ----

  private async runPMLoop(): Promise<void> {
    const { sendEvent, saveArtifact, system } = this.config;

    while (this.interactionCount < MAX_INTERACTIONS) {
      this.interactionCount++;

      // Send PM agent metadata
      this.orchState = { ...this.orchState, status: "running", currentAgent: "pm" };
      await sendEvent({
        agentRole: "pm",
        orchestrationState: this.orchState,
      });

      // Signal thinking
      await sendEvent({ thinking: true, agentRole: "pm" });

      // Build chat messages with agent annotations
      const chatMessages: ChatMessage[] = this.messages.map((m) => {
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

      let result;
      try {
        const systemPrompt = this.config.pmPrompt + this.config.artifactContext;
        result = await streamChat(
          chatMessages,
          () => { this.updateHeartbeat(); },
          this.config.model || DEFAULT_MODEL,
          this.config.allowedServices,
          systemPrompt
        );
      } catch (err) {
        clearInterval(progressTimer);
        this.activeTimers.delete(progressTimer);
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        await sendEvent({ error: `PM agent failed: ${errMsg}` });
        this.orchState = { ...this.orchState, status: "error" };
        system.signalCompletion(this.orchState);
        return;
      }

      clearInterval(progressTimer);
      this.activeTimers.delete(progressTimer);

      // Send usage
      if (result.usage) {
        await sendEvent({ usage: result.usage, model: this.config.model || DEFAULT_MODEL });
      }

      // Add PM response to history
      this.messages.push({
        role: "assistant",
        content: result.content,
        agentRole: "pm",
      });

      // Save PM artifact
      await saveArtifact("pm", result.content);

      // Parse PM action
      const pmAction = parsePMAction(result.content);

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

    // Create specialist config
    const specialistConfig: SpecialistConfig = {
      model: this.config.model,
      allowedServices: this.config.allowedServices,
      serviceInstances: this.config.serviceInstances,
      appContext: this.config.appContext,
      sendEvent: this.config.sendEvent,
    };

    // Create and spawn specialist actor
    const specialist = createSpecialistActor(target, 0, specialistConfig);
    await system.spawn(specialist);

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

    // The specialist will process asynchronously.
    // When done, it returns a task_result message which the actor system
    // routes back to PM via handleAgentResult.
    // We need to wait for it — set up a listener.
    await this.waitForSpecialistResult(specialist.id);
  }

  private async dispatchParallel(
    tasks: Array<{ taskId: string; task: string; files: string[] }>
  ): Promise<void> {
    const { system, sendEvent } = this.config;

    const groupId = `parallel-${Date.now()}`;
    this.currentGroupId = groupId;
    this.expectedParallelCount = tasks.length;
    this.pendingParallelResults.clear();

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

    // Create specialist config
    const specialistConfig: SpecialistConfig = {
      model: this.config.model,
      allowedServices: this.config.allowedServices,
      serviceInstances: this.config.serviceInstances,
      appContext: this.config.appContext,
      sendEvent: this.config.sendEvent,
    };

    // Spawn all developers and dispatch tasks concurrently
    const promises = tasks.map(async (task, index) => {
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
      });

      system.send(parallelMsg);

      // Wait for this developer to finish
      await this.waitForSpecialistResult(developer.id);
    });

    // Wait for all developers to complete
    await Promise.all(promises);
  }

  private async waitForSpecialistResult(specialistId: string): Promise<void> {
    // Poll for the specialist's completion by waiting for the actor to finish processing
    return new Promise<void>((resolve) => {
      const check = setInterval(() => {
        const actor = this.config.system.getActor(specialistId);
        if (!actor) {
          clearInterval(check);
          this.activeTimers.delete(check);
          resolve();
          return;
        }
        const state = actor.getState();
        if (state.status === "idle" || state.status === "dead") {
          clearInterval(check);
          this.activeTimers.delete(check);

          // Process pending response
          const response = actor.takePendingResponse();
          if (response) {
            // Route the response back to this PM actor
            response.to = this.id;
            this.send(response);
          }

          resolve();
        }
      }, 100);
      this.activeTimers.add(check);
    });
  }

  // ---- Merge Parallel Results ----

  private async mergeAndContinue(): Promise<void> {
    const { sendEvent, saveArtifact } = this.config;

    // Merge all developer outputs
    const mergedContent = this.mergeParallelResults();

    // Update state for each completed developer
    for (const [taskId, result] of this.pendingParallelResults) {
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
    const translated = await translateForUser(mergedContent, "developer");
    const displayContent = translated.content || stripJsonBlocks(mergedContent) || "所有開發者已完成工作。";
    await sendEvent({ content: displayContent, agentRole: "developer" });
    if (translated.usage) {
      await sendEvent({ usage: translated.usage, model: OUTPUT_MODEL });
    }

    // Add merged result to message history
    this.messages.push({
      role: "assistant",
      content: mergedContent,
      agentRole: "developer",
    });

    // Save merged artifact
    await saveArtifact("developer", mergedContent);

    // Directly write merged files to Docker container
    await this.executeFileOperations(mergedContent);

    // Reset parallel tracking
    this.pendingParallelResults.clear();
    this.expectedParallelCount = 0;
    this.currentGroupId = null;

    // Continue PM loop
    await this.runPMLoop();
  }

  private mergeParallelResults(): string {
    // Merge file outputs from all developers
    const allFiles: Array<{ path: string; content: string }> = [];
    let mergedAction = "create_app";
    let mergedName = "";
    let mergedTemplate = "";
    let mergedDescription = "";
    const mergedServices: Array<{ instanceId: string; name: string; type: string }> = [];
    const mergedPackages: string[] = [];

    for (const [, result] of this.pendingParallelResults) {
      try {
        const jsonMatch = result.content.match(/```json\s*\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.files) {
            for (const file of parsed.files) {
              // Later developer wins on path conflict
              const existingIdx = allFiles.findIndex((f) => f.path === file.path);
              if (existingIdx >= 0) {
                allFiles[existingIdx] = file;
              } else {
                allFiles.push(file);
              }
            }
          }
          if (parsed.action) mergedAction = parsed.action;
          if (parsed.name) mergedName = parsed.name;
          if (parsed.template) mergedTemplate = parsed.template;
          if (parsed.description) mergedDescription = parsed.description;
          if (parsed.requiredServices) {
            for (const s of parsed.requiredServices) {
              if (!mergedServices.find((ms) => ms.instanceId === s.instanceId)) {
                mergedServices.push(s);
              }
            }
          }
          if (parsed.npmPackages) {
            for (const p of parsed.npmPackages) {
              if (!mergedPackages.includes(p)) {
                mergedPackages.push(p);
              }
            }
          }
        }
      } catch {
        // Skip malformed results
      }
    }

    const merged = {
      action: mergedAction,
      name: mergedName,
      template: mergedTemplate,
      description: mergedDescription,
      requiredServices: mergedServices,
      npmPackages: mergedPackages,
      files: allFiles,
      _mergedFrom: Array.from(this.pendingParallelResults.keys()),
    };

    return `\`\`\`json\n${JSON.stringify(merged, null, 2)}\n\`\`\``;
  }

  // ---- Docker File Operations ----

  /**
   * Parse agent output and write files directly to the Docker container.
   */
  private async executeFileOperations(content: string): Promise<void> {
    if (!this.config.appSlug) return;

    try {
      const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
      if (!jsonMatch) return;

      const parsed = JSON.parse(jsonMatch[1]);
      if (
        parsed.files &&
        Array.isArray(parsed.files) &&
        parsed.files.length > 0 &&
        (parsed.action === "modify_files" ||
          parsed.action === "create_app" ||
          parsed.action === "update_app")
      ) {
        await writeFiles(this.config.appSlug, parsed.files);
        await this.config.sendEvent({
          filesWritten: {
            count: parsed.files.length,
            paths: parsed.files.map((f: { path: string }) => f.path),
          },
        });
      }
    } catch (err) {
      console.warn(
        `[PMActor] Failed to write files to container: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  // ---- Translation Helper ----

  /**
   * Translate agent output to user-facing content.
   * Returns the display string without sending SSE content events.
   */
  private async getDisplayContent(content: string, action: string): Promise<string> {
    const { sendEvent } = this.config;

    await sendEvent({ translating: true, agentRole: "pm" });

    const translated = await translateForUser(content, "pm");
    const displayContent =
      translated.content ||
      stripJsonBlocks(content) ||
      getFallbackMessage(action);

    if (translated.usage) {
      await sendEvent({ usage: translated.usage, model: OUTPUT_MODEL });
    }

    return displayContent;
  }
}
