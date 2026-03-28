/**
 * Specialist Actor Implementations
 *
 * Each specialist actor wraps an LLM call with the appropriate prompt.
 * They receive tasks from PM, execute via streamChat, and return results.
 */

import { Actor } from "./actor";
import type { ActorMessage, TaskPayload, TaskResultPayload, ParallelResultPayload } from "./types";
import { createMessage } from "./types";
import { streamChat, translateForUser, stripJsonBlocks, type ChatMessage, type TokenUsage } from "../ai";
import type { AgentRole } from "../agents/types";
import { parseAgentResult } from "../agents/orchestrator";
import {
  buildArchitectPrompt,
  buildDeveloperPrompt,
  buildReviewerPrompt,
  buildDevOpsPrompt,
  buildAppDevDeveloperPrompt,
} from "../agents/prompts";

export interface SpecialistConfig {
  model: string;
  allowedServices: string[];
  serviceInstances?: Array<{ id: string; name: string; type: string }>;
  appContext?: string;
  sendEvent: (data: unknown) => Promise<void>;
  locale?: string;
}

/** Progress messages shown while an agent is generating. */
const PROGRESS_MESSAGES: Record<string, string[]> = {
  architect: [
    "正在分析您的需求...",
    "正在評估最佳技術方案...",
    "正在選擇合適的框架和服務...",
    "正在規劃系統架構...",
    "正在確認技術細節...",
    "架構設計即將完成...",
  ],
  developer: [
    "正在準備開發環境...",
    "正在規劃應用程式結構...",
    "正在設計資料模型...",
    "正在實作核心功能...",
    "正在整合所需服務...",
    "應用程式即將建立完成...",
  ],
  reviewer: [
    "正在檢查程式碼品質...",
    "正在進行安全性審查...",
    "正在評估效能表現...",
    "正在整理審查結果...",
  ],
  devops: [
    "正在配置部署環境...",
    "正在設定服務連接...",
    "正在準備啟動應用程式...",
    "正在進行最終檢查...",
    "部署設定即將完成...",
  ],
};

const PROGRESS_INTERVAL_MS = 2500;

abstract class BaseSpecialistActor extends Actor {
  protected config: SpecialistConfig;
  private activeTimers: Set<ReturnType<typeof setInterval>> = new Set();

  constructor(id: string, role: AgentRole, config: SpecialistConfig) {
    super(id, role);
    this.config = config;
  }

  async onStart(): Promise<void> {
    // No initialization needed
  }

  onStop(): void {
    for (const timer of this.activeTimers) {
      clearInterval(timer);
    }
    this.activeTimers.clear();
  }

  async onRestart(error: Error): Promise<void> {
    console.warn(`[${this.role}Actor] Restarting after error: ${error.message}`);
  }

  protected trackTimer(timer: ReturnType<typeof setInterval>): void {
    this.activeTimers.add(timer);
  }

  protected clearTrackedTimer(timer: ReturnType<typeof setInterval>): void {
    clearInterval(timer);
    this.activeTimers.delete(timer);
  }

  /** Build the system prompt for this specialist. */
  protected abstract buildPrompt(task: string): string;

  /** Execute the LLM call and return the raw result. */
  protected async executeLLM(
    task: string,
    messages: Array<{ role: string; content: string; agentRole?: string }>,
    artifactContext: string
  ): Promise<{ content: string; usage: TokenUsage | null }> {
    const systemPrompt = this.buildPrompt(task) + artifactContext;
    const { sendEvent } = this.config;

    // Reset heartbeat before LLM call (may take long before first token)
    this.updateHeartbeat();

    // Send thinking event
    await sendEvent({ thinking: true, agentRole: this.role });

    // Set up progress updates
    let progressIdx = 0;
    const agentMsgs = PROGRESS_MESSAGES[this.role] || [];
    const progressTimer = setInterval(async () => {
      const msg = agentMsgs[Math.min(progressIdx, agentMsgs.length - 1)];
      progressIdx++;
      if (msg) {
        try {
          await sendEvent({ statusUpdate: msg, agentRole: this.role });
        } catch { /* stream may have closed */ }
      }
    }, PROGRESS_INTERVAL_MS);
    this.trackTimer(progressTimer);

    try {
      // Build chat messages, annotating other agents' outputs
      const chatMessages: ChatMessage[] = (messages || []).map((m) => {
        if (m.role === "assistant" && m.agentRole && m.agentRole !== this.role) {
          return {
            role: m.role as ChatMessage["role"],
            content: `[${m.agentRole.toUpperCase()} AGENT OUTPUT]:\n${m.content}`,
          };
        }
        return { role: m.role as ChatMessage["role"], content: m.content };
      });

      const result = await streamChat(
        chatMessages,
        () => {
          // Update heartbeat on each chunk
          this.updateHeartbeat();
        },
        this.config.model,
        this.config.allowedServices,
        systemPrompt
      );

      return result;
    } finally {
      this.clearTrackedTimer(progressTimer);
    }
  }

  /** Translate agent output for user display. */
  protected async translateAndSend(
    content: string,
    agentRole: AgentRole
  ): Promise<{ content: string; usage: TokenUsage | null }> {
    const { sendEvent } = this.config;

    await sendEvent({ translating: true, agentRole });

    const translated = await translateForUser(content, agentRole, this.config.locale);
    const displayContent = translated.content || stripJsonBlocks(content) || "處理完成。";

    await sendEvent({ content: displayContent, agentRole });

    if (translated.usage) {
      await sendEvent({ usage: translated.usage, model: "anthropic/claude-haiku-4.5" });
    }

    return translated;
  }
}

// ---- Architect Actor ----

export class ArchitectActor extends BaseSpecialistActor {
  constructor(id: string, config: SpecialistConfig) {
    super(id, "architect", config);
  }

  protected buildPrompt(task: string): string {
    const base = buildArchitectPrompt(
      this.config.allowedServices,
      this.config.serviceInstances
    );
    return `${base}\n\n--- TASK FROM PM ---\n${task}`;
  }

  async onReceive(message: ActorMessage): Promise<ActorMessage | null> {
    if (message.type !== "task") return null;

    const payload = message.payload as TaskPayload;
    const result = await this.executeLLM(
      payload.task,
      payload.messages || [],
      payload.context || ""
    );

    // Send usage
    if (result.usage) {
      await this.config.sendEvent({
        usage: result.usage,
        model: this.config.model,
      });
    }

    // Translate and send to user
    await this.translateAndSend(result.content, "architect");

    // Parse result for PM
    const parsed = parseAgentResult(result.content);

    return createMessage("task_result", this.id, message.from, {
      agentRole: "architect",
      content: result.content,
      summary: parsed.summary,
      blocked: parsed.blocked,
      blockedReason: parsed.blockedReason,
    } satisfies TaskResultPayload);
  }
}

// ---- Developer Actor ----

export class DeveloperActor extends BaseSpecialistActor {
  readonly instanceIndex: number;
  private taskId?: string;

  constructor(id: string, instanceIndex: number, config: SpecialistConfig) {
    super(id, "developer", config);
    this.instanceIndex = instanceIndex;
  }

  protected buildPrompt(task: string): string {
    const base = this.config.appContext
      ? buildAppDevDeveloperPrompt(this.config.appContext)
      : buildDeveloperPrompt(this.config.allowedServices);
    return `${base}\n\n--- TASK FROM PM ---\n${task}`;
  }

  async onReceive(message: ActorMessage): Promise<ActorMessage | null> {
    // Handle both regular task and parallel_task
    if (message.type === "task") {
      return this.handleTask(message);
    }
    if (message.type === "parallel_task") {
      return this.handleParallelTask(message);
    }
    return null;
  }

  private async handleTask(message: ActorMessage): Promise<ActorMessage> {
    const payload = message.payload as TaskPayload;
    const result = await this.executeLLM(
      payload.task,
      payload.messages || [],
      payload.context || ""
    );

    if (result.usage) {
      await this.config.sendEvent({
        usage: result.usage,
        model: this.config.model,
      });
    }

    await this.translateAndSend(result.content, "developer");

    const parsed = parseAgentResult(result.content);
    return createMessage("task_result", this.id, message.from, {
      agentRole: "developer",
      content: result.content,
      summary: parsed.summary,
      blocked: parsed.blocked,
      blockedReason: parsed.blockedReason,
    } satisfies TaskResultPayload);
  }

  private async handleParallelTask(message: ActorMessage): Promise<ActorMessage> {
    const payload = message.payload as {
      groupId: string;
      taskId: string;
      task: string;
      files: string[];
      context?: string;
      messages?: Array<{ role: string; content: string; agentRole?: string }>;
    };

    this.taskId = payload.taskId;

    // Add file scope info to the task
    const scopedTask = `${payload.task}\n\nYou are Developer #${this.instanceIndex}. You are ONLY responsible for these files:\n${payload.files.join("\n")}\n\nDo NOT create files outside your assigned scope.`;

    const result = await this.executeLLM(
      scopedTask,
      payload.messages || [],
      payload.context || ""
    );

    if (result.usage) {
      await this.config.sendEvent({
        usage: result.usage,
        model: this.config.model,
      });
    }

    // For parallel tasks, send status update instead of full translation
    await this.config.sendEvent({
      parallelActorStatus: {
        actorId: this.id,
        taskId: payload.taskId,
        groupId: payload.groupId,
        status: "completed",
        agentRole: "developer",
      },
    });

    const parsed = parseAgentResult(result.content);
    return createMessage("parallel_result", this.id, message.from, {
      groupId: payload.groupId,
      taskId: payload.taskId,
      agentRole: "developer",
      actorId: this.id,
      content: result.content,
      summary: parsed.summary,
      blocked: parsed.blocked,
      blockedReason: parsed.blockedReason,
    } satisfies ParallelResultPayload);
  }
}

// ---- Reviewer Actor ----

export class ReviewerActor extends BaseSpecialistActor {
  constructor(id: string, config: SpecialistConfig) {
    super(id, "reviewer", config);
  }

  protected buildPrompt(task: string): string {
    const base = buildReviewerPrompt();
    return `${base}\n\n--- TASK FROM PM ---\n${task}`;
  }

  async onReceive(message: ActorMessage): Promise<ActorMessage | null> {
    if (message.type !== "task") return null;

    const payload = message.payload as TaskPayload;
    const result = await this.executeLLM(
      payload.task,
      payload.messages || [],
      payload.context || ""
    );

    if (result.usage) {
      await this.config.sendEvent({
        usage: result.usage,
        model: this.config.model,
      });
    }

    await this.translateAndSend(result.content, "reviewer");

    const parsed = parseAgentResult(result.content);
    return createMessage("task_result", this.id, message.from, {
      agentRole: "reviewer",
      content: result.content,
      summary: parsed.summary,
      blocked: parsed.blocked,
      blockedReason: parsed.blockedReason,
    } satisfies TaskResultPayload);
  }
}

// ---- DevOps Actor ----

export class DevOpsActor extends BaseSpecialistActor {
  constructor(id: string, config: SpecialistConfig) {
    super(id, "devops", config);
  }

  protected buildPrompt(task: string): string {
    const base = buildDevOpsPrompt();
    return `${base}\n\n--- TASK FROM PM ---\n${task}`;
  }

  async onReceive(message: ActorMessage): Promise<ActorMessage | null> {
    if (message.type !== "task") return null;

    const payload = message.payload as TaskPayload;
    const result = await this.executeLLM(
      payload.task,
      payload.messages || [],
      payload.context || ""
    );

    if (result.usage) {
      await this.config.sendEvent({
        usage: result.usage,
        model: this.config.model,
      });
    }

    await this.translateAndSend(result.content, "devops");

    const parsed = parseAgentResult(result.content);
    return createMessage("task_result", this.id, message.from, {
      agentRole: "devops",
      content: result.content,
      summary: parsed.summary,
      blocked: parsed.blocked,
      blockedReason: parsed.blockedReason,
    } satisfies TaskResultPayload);
  }
}

// ---- Factory ----

export function createSpecialistActor(
  role: AgentRole,
  index: number,
  config: SpecialistConfig
): Actor {
  const id = `${role}-${index}`;
  switch (role) {
    case "architect":
      return new ArchitectActor(id, config);
    case "developer":
      return new DeveloperActor(id, index, config);
    case "reviewer":
      return new ReviewerActor(id, config);
    case "devops":
      return new DevOpsActor(id, config);
    default:
      throw new Error(`Cannot create specialist actor for role: ${role}`);
  }
}
