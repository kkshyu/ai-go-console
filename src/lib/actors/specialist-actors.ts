/**
 * Specialist Actor Implementations
 *
 * Each specialist actor wraps an LLM call with the appropriate prompt.
 * They receive tasks from PM, execute via streamChat, and return results.
 * Workers can discuss with each other and access background agents directly.
 *
 * Common onReceive logic lives in BaseSpecialistActor — subclasses
 * only need to implement buildPrompt().
 */

import { Actor } from "./actor";
import type {
  ActorMessage,
  TaskResultPayload,
  ParallelResultPayload,
  ParallelTaskPayload,
  DiscussPayload,
  DiscussReplyPayload,
  ReportPayload,
} from "./types";
import { createMessage } from "./types";
import { streamChat, translateForUser, stripJsonBlocks, getModelForAgent, getOutputModel, type ChatMessage, type TokenUsage } from "../ai";
import type { AgentRole } from "../agents/types";
import { parseAgentResult } from "../agents/orchestrator";
import {
  buildArchitectPrompt,
  buildDeveloperPrompt,
  buildReviewerPrompt,
  buildDevOpsPrompt,
  buildAppDevDeveloperPrompt,
  buildUXDesignerPrompt,
  buildTesterPrompt,
  buildDBMigratorPrompt,
  buildDocWriterPrompt,
} from "../agents/prompts";
import { actorLog } from "./logger";
import type { BackgroundActorSystem } from "./background-system";

export interface SpecialistConfig {
  model: string;
  allowedServices: string[];
  serviceInstances?: Array<{ id: string; name: string; type: string; status?: 'ok' | 'failed' | 'untested'; message?: string }>;
  appContext?: string;
  sendEvent: (data: unknown) => Promise<void>;
  locale?: string;
  peerRegistry?: Map<AgentRole, string>;
  conversationId?: string;
  backgroundSystem?: BackgroundActorSystem;
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
  ux_designer: [
    "正在分析視覺需求...",
    "正在設計色彩系統...",
    "正在規劃版面架構...",
    "正在制定設計規範...",
    "設計系統即將完成...",
  ],
  tester: [
    "正在分析程式碼結構...",
    "正在撰寫單元測試...",
    "正在撰寫整合測試...",
    "正在規劃端對端測試...",
    "測試檔案即將完成...",
  ],
  db_migrator: [
    "正在分析資料模型...",
    "正在設計資料庫結構...",
    "正在產生遷移腳本...",
    "正在準備種子資料...",
    "資料庫遷移即將完成...",
  ],
  doc_writer: [
    "正在整理專案資訊...",
    "正在撰寫 README...",
    "正在產生 API 文件...",
    "正在撰寫架構文件...",
    "文件撰寫即將完成...",
  ],
};

const PROGRESS_INTERVAL_MS = 2500;

/** Max rounds of peer discussion per task */
const MAX_DISCUSSION_ROUNDS = 2;
/** Discussion reply timeout */
const DISCUSSION_TIMEOUT_MS = 30_000;

/** Regex patterns that indicate the LLM output contains uncertainty worth discussing */
const UNCERTAINTY_MARKERS = [
  /\b(unclear|ambiguous|assumption|unsure|not sure|uncertain)\b/i,
  /\b(need clarification|missing information|depends on)\b/i,
  /"status":\s*"blocked"/,
];

abstract class BaseSpecialistActor extends Actor {
  protected config: SpecialistConfig;
  private activeTimers: Set<ReturnType<typeof setInterval>> = new Set();
  protected discussionLog: string[] = [];
  private pendingDiscussReply: {
    resolve: (payload: DiscussReplyPayload) => void;
    reject: (err: Error) => void;
  } | null = null;

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
    if (this.pendingDiscussReply) {
      this.pendingDiscussReply.reject(new Error("Actor stopped"));
      this.pendingDiscussReply = null;
    }
  }

  async onRestart(error: Error): Promise<void> {
    actorLog("warn", this.id, `Restarting after error: ${error.message}`, this.traceId);
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

  /**
   * Default onReceive for regular task messages.
   * Handles: executeLLM → check for discuss → send usage → translate → parse → return task_result or report.
   */
  async onReceive(message: ActorMessage): Promise<ActorMessage | null> {
    if (message.type === "discuss") {
      return this.handleDiscuss(message);
    }
    if (message.type === "discuss_reply") {
      this.handleDiscussReply(message);
      return null;
    }
    if (message.type !== "task") return null;

    const payload = message.payload;
    const result = await this.executeLLM(
      payload.task,
      payload.messages || [],
      payload.context || ""
    );

    const effectiveModel = getModelForAgent(this.role, this.config.model);

    if (result.usage) {
      await this.config.sendEvent({
        usage: result.usage,
        model: effectiveModel,
      });
    }

    // Check if LLM wants to discuss with a peer (explicit request or auto-detected uncertainty)
    const discussRequest = this.parseDiscussRequest(result.content)
      ?? this.detectUncertainty(result.content);
    if (discussRequest && this.config.peerRegistry) {
      const enrichedContent = await this.conductDiscussion(
        discussRequest,
        result.content,
      );
      if (enrichedContent) {
        // Re-run LLM with discussion context
        const finalResult = await this.executeLLM(
          `${payload.task}\n\n--- PEER DISCUSSION RESULTS ---\n${enrichedContent}`,
          payload.messages || [],
          payload.context || ""
        );
        if (finalResult.usage) {
          await this.config.sendEvent({ usage: finalResult.usage, model: effectiveModel });
        }
        await this.translateAndSend(finalResult.content, this.role);
        const parsed = parseAgentResult(finalResult.content);

        // Use report (includes discussion log) instead of task_result
        return createMessage("report", this.id, message.from, {
          agentRole: this.role,
          content: finalResult.content,
          summary: parsed.summary,
          discussionLog: [...this.discussionLog],
        } satisfies ReportPayload);
      }
    }

    await this.translateAndSend(result.content, this.role);

    const parsed = parseAgentResult(result.content);

    // If we had any discussions, use report; otherwise use task_result
    if (this.discussionLog.length > 0) {
      return createMessage("report", this.id, message.from, {
        agentRole: this.role,
        content: result.content,
        summary: parsed.summary,
        discussionLog: [...this.discussionLog],
      } satisfies ReportPayload);
    }

    return createMessage("task_result", this.id, message.from, {
      agentRole: this.role,
      content: result.content,
      summary: parsed.summary,
      blocked: parsed.blocked,
      blockedReason: parsed.blockedReason,
    } satisfies TaskResultPayload);
  }

  // ---- Discussion Handling ----

  /** Handle incoming discussion request from another worker */
  private async handleDiscuss(message: ActorMessage & { type: "discuss" }): Promise<ActorMessage> {
    const payload = message.payload;
    const { sendEvent } = this.config;

    await sendEvent({
      discussion: {
        from: payload.fromRole,
        to: this.role,
        topic: payload.topic,
      },
      agentRole: this.role,
    });

    // Build a prompt to respond to the discussion
    const discussPrompt = `You received a discussion request from the ${payload.fromRole} agent.

Topic: ${payload.topic}

Their message:
${payload.content}

${payload.context ? `Context:\n${payload.context}` : ""}

Respond with your perspective on this topic. Be concise and technical.`;

    this.updateHeartbeat();
    const result = await streamChat(
      [{ role: "user", content: discussPrompt }],
      () => { this.updateHeartbeat(); },
      getModelForAgent(this.role, this.config.model),
      this.config.allowedServices,
      this.buildPrompt("")
    );

    this.discussionLog.push(
      `[${payload.fromRole} → ${this.role}] ${payload.topic}: ${payload.content}`,
      `[${this.role} reply] ${result.content}`
    );

    return createMessage("discuss_reply", this.id, message.from, {
      topic: payload.topic,
      content: result.content,
      fromRole: this.role,
      inReplyTo: message.id,
    } satisfies DiscussReplyPayload);
  }

  /** Handle incoming discussion reply */
  private handleDiscussReply(message: ActorMessage & { type: "discuss_reply" }): void {
    const payload = message.payload;
    this.discussionLog.push(`[${payload.fromRole} reply to ${payload.topic}] ${payload.content}`);

    if (this.pendingDiscussReply) {
      this.pendingDiscussReply.resolve(payload);
      this.pendingDiscussReply = null;
    }
  }

  /** Parse LLM output for a discussion request */
  private parseDiscussRequest(content: string): { target: AgentRole; topic: string; content: string } | null {
    const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
    if (!jsonMatch) return null;

    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.discuss && parsed.discuss.target && parsed.discuss.topic) {
        return {
          target: parsed.discuss.target as AgentRole,
          topic: parsed.discuss.topic,
          content: parsed.discuss.content || parsed.discuss.topic,
        };
      }
    } catch {
      // Not a valid discuss request
    }
    return null;
  }

  /** Detect uncertainty markers in LLM output that suggest peer discussion would help */
  private detectUncertainty(content: string): { target: AgentRole; topic: string; content: string } | null {
    if (!this.config.peerRegistry || this.config.peerRegistry.size === 0) return null;

    const hasUncertainty = UNCERTAINTY_MARKERS.some(marker => marker.test(content));
    if (!hasUncertainty) return null;

    // Developer → Architect, Architect → Developer
    const targetRole: AgentRole | null =
      this.role === "developer" ? "architect" :
      this.role === "architect" ? "developer" :
      null;
    if (!targetRole || !this.config.peerRegistry.has(targetRole)) return null;

    return {
      target: targetRole,
      topic: "Clarification needed on specifications",
      content: `I detected uncertainty in my analysis. Here is my current output for your review:\n${content.slice(0, 500)}`,
    };
  }

  /** Conduct a discussion with a peer worker */
  private async conductDiscussion(
    request: { target: AgentRole; topic: string; content: string },
    originalContent: string,
  ): Promise<string | null> {
    const peerActorId = this.config.peerRegistry?.get(request.target);
    if (!peerActorId) {
      actorLog("warn", this.id, `Peer ${request.target} not available for discussion`, this.traceId);
      return null;
    }

    let allReplies = "";

    for (let round = 0; round < MAX_DISCUSSION_ROUNDS; round++) {
      const discussMsg = createMessage("discuss", this.id, peerActorId, {
        topic: request.topic,
        content: round === 0 ? request.content : `Follow-up: ${request.content}`,
        fromRole: this.role,
        context: originalContent,
      } satisfies DiscussPayload);

      await this.config.sendEvent({
        discussion: {
          from: this.role,
          to: request.target,
          topic: request.topic,
          round: round + 1,
        },
        agentRole: this.role,
      });

      // Send via system routing
      if (!this._getSystemSend()) {
        actorLog("warn", this.id, "No system send available for discussion", this.traceId);
        return null;
      }
      this._getSystemSend()!(discussMsg);

      // Wait for reply with timeout
      try {
        const reply = await this.waitForDiscussReply();
        allReplies += `[Round ${round + 1}] ${reply.fromRole}: ${reply.content}\n`;
        this.discussionLog.push(
          `[${this.role} → ${request.target} round ${round + 1}] ${request.content}`,
          `[${reply.fromRole} reply round ${round + 1}] ${reply.content}`
        );

        // Only continue if the LLM explicitly requests more discussion
        // For now, one round is usually sufficient
        break;
      } catch {
        actorLog("warn", this.id, `Discussion timeout with ${request.target} at round ${round + 1}`, this.traceId);
        break;
      }
    }

    return allReplies || null;
  }

  /** Wait for a discuss_reply with timeout */
  private waitForDiscussReply(): Promise<DiscussReplyPayload> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingDiscussReply) {
          this.pendingDiscussReply = null;
          reject(new Error("Discussion reply timeout"));
        }
      }, DISCUSSION_TIMEOUT_MS);

      this.pendingDiscussReply = {
        resolve: (payload) => {
          clearTimeout(timeout);
          resolve(payload);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      };
    });
  }

  /** Access the system send function (exposed for discussion routing) */
  private _getSystemSend(): ((msg: ActorMessage) => void) | null {
    // Access the protected _systemSend from Actor base class via the public setter's stored reference
    return (this as unknown as { _systemSend: ((msg: ActorMessage) => void) | null })._systemSend;
  }

  // ---- Background Agent Access ----

  /** Request RAG retrieval from the background system */
  protected async requestRetrieval(query: string): Promise<string> {
    const bg = this.config.backgroundSystem;
    if (!bg || !bg.initialized || !this.config.conversationId) return "";

    try {
      const result = await bg.request<{
        context: string;
        chunks: Array<{ content: string; similarity: number; agentRole: string }>;
      }>(
        "retrieval",
        "retrieve_request",
        { conversationId: this.config.conversationId, query },
        10_000,
      );
      return result.context || "";
    } catch (err) {
      actorLog("warn", this.id, `Retrieval failed: ${err}`, this.traceId);
      return "";
    }
  }

  /** Fire-and-forget embedding request */
  protected fireEmbedding(content: string, sourceId: string): void {
    const bg = this.config.backgroundSystem;
    if (!bg || !bg.initialized || !this.config.conversationId) return;

    bg.fireAndForget("embedding", "embed_request", {
      sourceType: "agent_output",
      sourceId,
      conversationId: this.config.conversationId,
      agentRole: this.role,
      content,
    });
  }

  /** Execute the LLM call and return the raw result. */
  protected async executeLLM(
    task: string,
    messages: Array<{ role: string; content: string; agentRole?: string }>,
    artifactContext: string
  ): Promise<{ content: string; usage: TokenUsage | null }> {
    const systemPrompt = this.buildPrompt(task) + artifactContext;
    const { sendEvent } = this.config;
    const effectiveModel = getModelForAgent(this.role, this.config.model);

    // Reset heartbeat before LLM call (may take long before first token)
    this.updateHeartbeat();

    // Optionally augment context via RAG
    let ragContext = "";
    if (this.config.backgroundSystem && this.config.conversationId) {
      ragContext = await this.requestRetrieval(task);
    }

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

      const fullSystemPrompt = ragContext
        ? `${systemPrompt}\n\n--- RELEVANT CONTEXT (RAG) ---\n${ragContext}`
        : systemPrompt;

      const result = await streamChat(
        chatMessages,
        () => {
          // Update heartbeat on each chunk
          this.updateHeartbeat();
        },
        effectiveModel,
        this.config.allowedServices,
        fullSystemPrompt
      );

      // Fire embedding for the output
      this.fireEmbedding(result.content, `${this.id}-${Date.now()}`);

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
      await sendEvent({ usage: translated.usage, model: getOutputModel() });
    }

    return translated;
  }

  /** Get available peer names for prompt building */
  protected getPeerList(): string {
    if (!this.config.peerRegistry || this.config.peerRegistry.size === 0) {
      return "";
    }
    const peers = Array.from(this.config.peerRegistry.entries())
      .filter(([role]) => role !== this.role)
      .map(([role]) => role);
    if (peers.length === 0) return "";
    return peers.join(", ");
  }

  /** Build peer discussion prompt section */
  protected buildPeerDiscussionSection(): string {
    const peers = this.getPeerList();
    if (!peers) return "";

    return `

PEER DISCUSSION:
You can discuss with these active peers: ${peers}
To request a discussion, include a "discuss" field in your JSON output:
\`\`\`json
{
  "discuss": {
    "target": "architect",
    "topic": "Brief topic description",
    "content": "Your question or discussion point"
  },
  ... your normal output ...
}
\`\`\`
Use discussion when:
- You need another agent's perspective on a technical decision
- You're unsure about requirements that fall under another agent's expertise
- You want to validate your approach before committing
Discussion is optional — only use it when genuinely useful.`;
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
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
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
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
  }

  async onReceive(message: ActorMessage): Promise<ActorMessage | null> {
    // Handle discussion messages
    if (message.type === "discuss" || message.type === "discuss_reply") {
      return super.onReceive(message);
    }
    // Handle both regular task and parallel_task
    if (message.type === "task") {
      return super.onReceive(message);
    }
    if (message.type === "parallel_task") {
      return this.handleParallelTask(message);
    }
    return null;
  }

  private async handleParallelTask(message: ActorMessage & { type: "parallel_task" }): Promise<ActorMessage> {
    const payload = message.payload as ParallelTaskPayload;

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
        model: getModelForAgent(this.role, this.config.model),
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
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
  }
}

// ---- DevOps Actor ----

export class DevOpsActor extends BaseSpecialistActor {
  constructor(id: string, config: SpecialistConfig) {
    super(id, "devops", config);
  }

  protected buildPrompt(task: string): string {
    const base = buildDevOpsPrompt();
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
  }
}

// ---- UX Designer Actor ----

export class UXDesignerActor extends BaseSpecialistActor {
  constructor(id: string, config: SpecialistConfig) {
    super(id, "ux_designer", config);
  }

  protected buildPrompt(task: string): string {
    const base = buildUXDesignerPrompt();
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
  }
}

// ---- Tester Actor ----

export class TesterActor extends BaseSpecialistActor {
  constructor(id: string, config: SpecialistConfig) {
    super(id, "tester", config);
  }

  protected buildPrompt(task: string): string {
    const base = buildTesterPrompt();
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
  }
}

// ---- DB Migrator Actor ----

export class DBMigratorActor extends BaseSpecialistActor {
  constructor(id: string, config: SpecialistConfig) {
    super(id, "db_migrator", config);
  }

  protected buildPrompt(task: string): string {
    const base = buildDBMigratorPrompt();
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
  }
}

// ---- Doc Writer Actor ----

export class DocWriterActor extends BaseSpecialistActor {
  constructor(id: string, config: SpecialistConfig) {
    super(id, "doc_writer", config);
  }

  protected buildPrompt(task: string): string {
    const base = buildDocWriterPrompt();
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
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
    case "ux_designer":
      return new UXDesignerActor(id, config);
    case "tester":
      return new TesterActor(id, config);
    case "db_migrator":
      return new DBMigratorActor(id, config);
    case "doc_writer":
      return new DocWriterActor(id, config);
    default:
      throw new Error(`Cannot create specialist actor for role: ${role}`);
  }
}
