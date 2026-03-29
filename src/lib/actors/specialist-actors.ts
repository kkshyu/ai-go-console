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
  SubTaskPayload,
  SubTaskResultPayload,
  SeniorPlanPayload,
} from "./types";
import { createMessage } from "./types";
import type { ActorSystem } from "./actor-system";
import { streamChat, translateForUser, stripJsonBlocks, getOutputModel, type ChatMessage, type TokenUsage } from "../ai";
import { getModelForTier } from "../model-tiers";
import type { ModelTier } from "../model-tiers";
import type { AgentRole, SeniorPlan, SubTask } from "../agents/types";
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
  buildSeniorPlanningPrompt,
  buildSeniorSynthesisPrompt,
  buildJuniorExecutionPreamble,
} from "../agents/prompts";
import { actorLog } from "./logger";
import type { BackgroundActorSystem } from "./background-system";
import {
  getPlanningTasksMessage,
  getSynthesizingMessage,
  getSpecialistProgressMessage,
  getSpecialistDoneMessage,
  getSubTaskProgressMessages,
} from "../../i18n/pm-messages";

export interface SpecialistConfig {
  model: string;
  serviceInstances?: Array<{ id: string; name: string; type: string; status?: 'ok' | 'failed' | 'untested'; message?: string }>;
  appContext?: string;
  sendEvent: (data: unknown) => Promise<void>;
  locale?: string;
  peerRegistry?: Map<AgentRole, string>;
  conversationId?: string;
  backgroundSystem?: BackgroundActorSystem;
  /** ActorSystem reference — required for senior agents to spawn juniors */
  system?: ActorSystem;
  /** Org-level model overrides from DB */
  orgModelConfigs?: Array<{ agentRole: string; modelId: string }>;
}

/** Progress messages are now loaded from i18n (see pm-messages.ts). */

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

    const effectiveModel = getModelForTier(this.role, "senior", this.config.model, this.config.orgModelConfigs);

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
      getModelForTier(this.role, "senior", this.config.model, this.config.orgModelConfigs),
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

    // Peer discussion routing: each agent discusses with the most relevant hub
    const PEER_DISCUSSION_MAP: Partial<Record<AgentRole, AgentRole>> = {
      developer: "architect",      // implementation questions → designer
      architect: "developer",      // design feasibility → implementer
      reviewer: "developer",       // security/quality issues → implementer
      ux_designer: "developer",    // design specs → implementer
      tester: "developer",         // test issues → implementer
      db_migrator: "architect",    // schema design → architect
      devops: "architect",         // infrastructure → architect
      doc_writer: "architect",     // architecture understanding → architect
    };
    const targetRole: AgentRole | null = PEER_DISCUSSION_MAP[this.role] ?? null;
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
    const effectiveModel = getModelForTier(this.role, "senior", this.config.model, this.config.orgModelConfigs);

    // Reset heartbeat before LLM call (may take long before first token)
    this.updateHeartbeat();

    // Optionally augment context via RAG
    let ragContext = "";
    if (this.config.backgroundSystem && this.config.conversationId) {
      ragContext = await this.requestRetrieval(task);
    }

    // Send thinking event
    await sendEvent({ thinking: true, agentRole: this.role });

    // Set up progress updates — locale-aware with agent role indicated
    let progressIdx = 0;
    const progressTimer = setInterval(async () => {
      const msg = getSpecialistProgressMessage(this.role, progressIdx, this.config.locale);
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
    const displayContent = translated.content || stripJsonBlocks(content) || getSpecialistDoneMessage(this.config.locale);

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
      : buildDeveloperPrompt();
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
        model: getModelForTier(this.role, "senior", this.config.model, this.config.orgModelConfigs),
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

// ---- Senior Specialist Actor (Plan → Delegate → Synthesize) ----

/** Max sub-tasks a senior can create */
const MAX_SUB_TASKS = 6;
/** Timeout waiting for all juniors to complete */
const JUNIOR_COLLECTION_TIMEOUT_MS = 120_000;

/**
 * Abstract senior specialist actor.
 *
 * When a senior receives a `task` from PM, it:
 * 1. Plans: Calls LLM to decompose the task into sub-tasks (SeniorPlan JSON)
 * 2. Simple-task bypass: If only 1 sub-task with low complexity, executes directly
 * 3. Dispatches juniors: Spawns JuniorSpecialistActors for each sub-task
 * 4. Collects results: Accumulates sub_task_result messages from juniors
 * 5. Synthesizes: Calls LLM to merge all junior outputs into final result
 *
 * Returns standard task_result to PM — PM is unaware of the internal hierarchy.
 */
abstract class SeniorSpecialistActor extends BaseSpecialistActor {
  private currentPlan: SeniorPlan | null = null;
  private pendingSubTaskResults: Map<string, SubTaskResultPayload> = new Map();
  private expectedSubTaskCount = 0;
  private originalMessage: ActorMessage | null = null;
  private juniorCounter = 0;
  private collectionTimeout: ReturnType<typeof setTimeout> | null = null;
  /** Sub-tasks waiting for their dependencies to complete before dispatch */
  private pendingDependentTasks: Map<string, SubTask> = new Map();
  /** Set of completed sub-task IDs for dependency resolution */
  private completedSubTaskIds: Set<string> = new Set();
  /** Stored results by sub-task ID for passing upstream context to dependents */
  private subTaskResultContents: Map<string, string> = new Map();

  /** Subclasses must provide the standard role prompt builder */
  protected abstract buildPrompt(task: string): string;

  async onReceive(message: ActorMessage): Promise<ActorMessage | null> {
    // Handle discussion messages normally
    if (message.type === "discuss" || message.type === "discuss_reply") {
      return super.onReceive(message);
    }

    // Handle sub_task_result from juniors
    if (message.type === "sub_task_result") {
      return this.handleSubTaskResult(message);
    }

    // Only handle task messages for the planning flow
    if (message.type !== "task") return null;

    const { system } = this.config;

    // If no ActorSystem available, fall back to direct execution (backward compat)
    if (!system) {
      actorLog("warn", this.id, "No ActorSystem reference — executing directly as legacy specialist", this.traceId);
      return super.onReceive(message);
    }

    this.originalMessage = message;
    const payload = message.payload;

    // Phase 1: Planning — ask senior LLM to decompose the task
    const plan = await this.planTask(payload.task, payload.context || "");

    if (!plan) {
      // Planning failed — fall back to direct execution
      actorLog("warn", this.id, "Planning failed — executing directly", this.traceId);
      return super.onReceive(message);
    }

    this.currentPlan = plan;

    // Phase 2: Simple-task bypass
    if (plan.subTasks.length <= 1 && plan.estimatedComplexity === "low") {
      actorLog("info", this.id, "Simple task — bypassing junior delegation", this.traceId);
      return super.onReceive(message);
    }

    // Send senior_plan event for UI observability
    const juniorCount = plan.subTasks.filter(t => t.tier === "junior").length;
    const midCount = plan.subTasks.filter(t => t.tier === "intermediate").length;
    const planMsg = createMessage("senior_plan", this.id, message.from, {
      agentRole: this.role,
      strategy: plan.strategy,
      subTaskCount: plan.subTasks.length,
      tiers: { junior: juniorCount, intermediate: midCount },
    } satisfies SeniorPlanPayload);
    // Route plan event through system to PM
    if (this._getSystemSendFn()) {
      this._getSystemSendFn()!(planMsg);
    }

    // Phase 3: Dispatch juniors
    this.expectedSubTaskCount = plan.subTasks.length;
    this.pendingSubTaskResults.clear();

    // Set collection timeout
    this.collectionTimeout = setTimeout(async () => {
      if (this.pendingSubTaskResults.size < this.expectedSubTaskCount) {
        actorLog("warn", this.id, `Junior collection timeout: ${this.pendingSubTaskResults.size}/${this.expectedSubTaskCount} — synthesizing partial results`, this.traceId);
        await this.synthesizeAndRespond();
      }
    }, JUNIOR_COLLECTION_TIMEOUT_MS);

    // Group sub-tasks by dependency layers for parallel execution
    await this.dispatchSubTasks(plan.subTasks, message);

    // Return null — we'll respond asynchronously after all juniors complete
    return null;
  }

  private async planTask(task: string, context: string): Promise<SeniorPlan | null> {
    const planningPrompt = buildSeniorPlanningPrompt(this.role, task, context);
    const effectiveModel = getModelForTier(this.role, "senior", this.config.model, this.config.orgModelConfigs);

    this.updateHeartbeat();
    await this.config.sendEvent({ statusUpdate: getPlanningTasksMessage(this.role, this.config.locale), agentRole: this.role });

    try {
      const result = await streamChat(
        [{ role: "user", content: task }],
        () => { this.updateHeartbeat(); },
        effectiveModel,
        planningPrompt,
      );

      if (result.usage) {
        await this.config.sendEvent({ usage: result.usage, model: effectiveModel });
      }

      // Parse the plan JSON from the LLM output
      const jsonMatch = result.content.match(/```json\s*\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        actorLog("warn", this.id, "No JSON plan found in LLM output", this.traceId);
        return null;
      }

      const parsed = JSON.parse(jsonMatch[1]) as SeniorPlan;

      // Validate and cap sub-tasks
      if (!parsed.subTasks || parsed.subTasks.length === 0) return null;
      if (parsed.subTasks.length > MAX_SUB_TASKS) {
        parsed.subTasks = parsed.subTasks.slice(0, MAX_SUB_TASKS);
      }

      return parsed;
    } catch (err) {
      actorLog("error", this.id, `Planning LLM call failed: ${err}`, this.traceId);
      return null;
    }
  }

  private async dispatchSubTasks(subTasks: SubTask[], originalMessage: ActorMessage): Promise<void> {
    const { system } = this.config;
    if (!system) return;

    // Split into independent and dependent sub-tasks
    const noDeps = subTasks.filter(t => !t.dependsOn || t.dependsOn.length === 0);
    const withDeps = subTasks.filter(t => t.dependsOn && t.dependsOn.length > 0);

    // Store dependent tasks — they'll be dispatched when their dependencies complete
    for (const subTask of withDeps) {
      this.pendingDependentTasks.set(subTask.subTaskId, subTask);
    }

    // Dispatch independent sub-tasks in parallel immediately
    for (const subTask of noDeps) {
      await this.spawnAndDispatchJunior(subTask, originalMessage);
    }

    // Edge case: if all tasks have deps (e.g. circular or missing deps),
    // try dispatching any whose deps don't exist in the task set
    if (noDeps.length === 0 && withDeps.length > 0) {
      const allIds = new Set(subTasks.map(t => t.subTaskId));
      for (const subTask of withDeps) {
        const hasUnresolvableDep = subTask.dependsOn!.every(dep => !allIds.has(dep));
        if (hasUnresolvableDep) {
          this.pendingDependentTasks.delete(subTask.subTaskId);
          await this.spawnAndDispatchJunior(subTask, originalMessage);
        }
      }
    }
  }

  /**
   * Check and dispatch any pending dependent tasks whose dependencies are now satisfied.
   */
  private async dispatchReadyDependents(): Promise<void> {
    if (this.pendingDependentTasks.size === 0 || !this.originalMessage) return;

    const toDispatch: SubTask[] = [];

    for (const [id, subTask] of this.pendingDependentTasks) {
      const depsResolved = subTask.dependsOn!.every(dep => this.completedSubTaskIds.has(dep));
      if (depsResolved) {
        toDispatch.push(subTask);
      }
    }

    for (const subTask of toDispatch) {
      this.pendingDependentTasks.delete(subTask.subTaskId);

      // Build upstream context from completed dependency results
      const depContext = subTask.dependsOn!
        .map(depId => {
          const content = this.subTaskResultContents.get(depId);
          return content ? `[Dependency ${depId} result]: ${content.slice(0, 2000)}` : null;
        })
        .filter(Boolean)
        .join("\n\n");

      await this.spawnAndDispatchJunior(subTask, this.originalMessage!, depContext);
    }
  }

  private async spawnAndDispatchJunior(subTask: SubTask, originalMessage: ActorMessage, dependencyContext?: string): Promise<void> {
    const { system, sendEvent } = this.config;
    if (!system) return;

    const tier = subTask.tier as ModelTier;
    const tierLabel = tier === "intermediate" ? "mid" : "junior";
    const juniorId = `${this.role}-${tierLabel}-${this.juniorCounter++}`;

    // Create junior config (no system needed — juniors don't spawn their own children)
    const juniorConfig: SpecialistConfig = {
      model: this.config.model,
      serviceInstances: this.config.serviceInstances,
      appContext: this.config.appContext,
      sendEvent: this.config.sendEvent,
      locale: this.config.locale,
      conversationId: this.config.conversationId,
      backgroundSystem: this.config.backgroundSystem,
      // No system, no peerRegistry for juniors
    };

    const junior = new JuniorSpecialistActor(
      juniorId,
      this.role,
      tier,
      this.buildPrompt, // pass the role-specific prompt builder
      juniorConfig,
    );

    await system.spawnChild(this.id, junior);

    // Send sub-task dispatched event for UI
    await sendEvent({
      subTaskDispatched: {
        parentActorId: this.id,
        actorId: juniorId,
        subTaskId: subTask.subTaskId,
        agentRole: this.role,
        tier,
        description: subTask.description.slice(0, 100),
      },
    });

    // Build context: original context + dependency results (if any)
    const baseContext = (originalMessage as { payload: { context?: string } }).payload.context || "";
    const fullContext = dependencyContext
      ? `${baseContext}\n\n--- UPSTREAM DEPENDENCY RESULTS ---\n${dependencyContext}`
      : baseContext;

    // Dispatch the sub_task message
    const taskMsg = createMessage("sub_task", this.id, juniorId, {
      subTaskId: subTask.subTaskId,
      task: subTask.description,
      tier,
      context: fullContext,
      seniorStrategy: this.currentPlan?.strategy,
      files: subTask.files,
      messages: (originalMessage as { payload: { messages?: Array<{ role: string; content: string }> } }).payload.messages,
    } satisfies SubTaskPayload);

    system.send(taskMsg);
  }

  private async handleSubTaskResult(message: ActorMessage & { type: "sub_task_result" }): Promise<ActorMessage | null> {
    const payload = message.payload;

    this.pendingSubTaskResults.set(payload.subTaskId, payload);
    this.completedSubTaskIds.add(payload.subTaskId);
    this.subTaskResultContents.set(payload.subTaskId, payload.content || "");
    actorLog("info", this.id, `Received sub_task_result ${payload.subTaskId} (${this.pendingSubTaskResults.size}/${this.expectedSubTaskCount})`, this.traceId);

    // Send sub-task complete event for UI
    await this.config.sendEvent({
      subTaskComplete: {
        parentActorId: this.id,
        actorId: payload.actorId,
        subTaskId: payload.subTaskId,
        tier: payload.tier,
        summary: payload.summary?.slice(0, 100) || "Completed",
      },
    });

    // Dispatch any dependent tasks whose dependencies are now satisfied
    await this.dispatchReadyDependents();

    // Check if all sub-tasks are done
    if (this.pendingSubTaskResults.size >= this.expectedSubTaskCount) {
      if (this.collectionTimeout) {
        clearTimeout(this.collectionTimeout);
        this.collectionTimeout = null;
      }
      await this.synthesizeAndRespond();
    }

    return null;
  }

  private async synthesizeAndRespond(): Promise<void> {
    if (!this.originalMessage || !this.currentPlan) return;

    const subTaskResults = Array.from(this.pendingSubTaskResults.values()).map(r => ({
      subTaskId: r.subTaskId,
      content: r.content,
      tier: r.tier,
    }));

    // Phase 5: Synthesis
    await this.config.sendEvent({ statusUpdate: getSynthesizingMessage(this.role, this.config.locale), agentRole: this.role });

    const synthesisPrompt = buildSeniorSynthesisPrompt(
      this.role,
      this.currentPlan.strategy,
      subTaskResults,
    );

    const effectiveModel = getModelForTier(this.role, "senior", this.config.model, this.config.orgModelConfigs);
    this.updateHeartbeat();

    try {
      const result = await streamChat(
        [{ role: "user", content: "Synthesize the sub-task results into a final output." }],
        () => { this.updateHeartbeat(); },
        effectiveModel,
        synthesisPrompt,
      );

      if (result.usage) {
        await this.config.sendEvent({ usage: result.usage, model: effectiveModel });
      }

      // Translate final output for user display
      await this.translateAndSend(result.content, this.role);

      const parsed = parseAgentResult(result.content);

      // Return task_result to PM — PM doesn't know about the internal hierarchy
      const responseMsg = createMessage("task_result", this.id, this.originalMessage.from, {
        agentRole: this.role,
        content: result.content,
        summary: parsed.summary,
        blocked: parsed.blocked,
        blockedReason: parsed.blockedReason,
      } satisfies TaskResultPayload);

      // Route through system
      if (this._getSystemSendFn()) {
        this._getSystemSendFn()!(responseMsg);
      }
    } catch (err) {
      actorLog("error", this.id, `Synthesis failed: ${err}`, this.traceId);
      // Fall back: concatenate all junior results
      const fallbackContent = subTaskResults.map(r => r.content).join("\n\n---\n\n");
      const parsed = parseAgentResult(fallbackContent);

      const responseMsg = createMessage("task_result", this.id, this.originalMessage.from, {
        agentRole: this.role,
        content: fallbackContent,
        summary: parsed.summary,
        blocked: false,
      } satisfies TaskResultPayload);

      if (this._getSystemSendFn()) {
        this._getSystemSendFn()!(responseMsg);
      }
    }
  }

  onStop(): void {
    super.onStop();
    if (this.collectionTimeout) {
      clearTimeout(this.collectionTimeout);
      this.collectionTimeout = null;
    }
  }

  /** Access the system send function */
  private _getSystemSendFn(): ((msg: ActorMessage) => void) | null {
    return (this as unknown as { _systemSend: ((msg: ActorMessage) => void) | null })._systemSend;
  }
}

// ---- Junior Specialist Actor ----

/** Junior progress messages are now loaded from i18n (see pm-messages.ts). */

/**
 * Junior/Intermediate specialist actor — executes a single sub-task.
 * Uses the same role-specific prompt as the senior but with a junior execution preamble.
 * Does NOT translate output (senior handles that after synthesis).
 * Does NOT conduct peer discussions.
 */
class JuniorSpecialistActor extends BaseSpecialistActor {
  private tier: ModelTier;
  private rolePromptBuilder: (task: string) => string;

  constructor(
    id: string,
    role: AgentRole,
    tier: ModelTier,
    rolePromptBuilder: (task: string) => string,
    config: SpecialistConfig,
  ) {
    super(id, role, config);
    this.tier = tier;
    this.rolePromptBuilder = rolePromptBuilder;
  }

  protected buildPrompt(task: string): string {
    const preamble = buildJuniorExecutionPreamble(this.role, this.tier);
    const rolePrompt = this.rolePromptBuilder(task);
    return `${preamble}${rolePrompt}`;
  }

  async onReceive(message: ActorMessage): Promise<ActorMessage | null> {
    if (message.type !== "sub_task") return null;

    const payload = message.payload as SubTaskPayload;
    const effectiveModel = getModelForTier(this.role, this.tier, undefined, this.config.orgModelConfigs);

    this.updateHeartbeat();

    // Progress updates — locale-aware with role indicated
    let progressIdx = 0;
    const juniorMsgs = getSubTaskProgressMessages(this.role, this.config.locale);
    const progressTimer = setInterval(async () => {
      const msg = juniorMsgs[Math.min(progressIdx, juniorMsgs.length - 1)];
      progressIdx++;
      try {
        await this.config.sendEvent({ statusUpdate: msg, agentRole: this.role, actorId: this.id });
      } catch { /* stream may have closed */ }
    }, 3000);
    this.trackTimer(progressTimer);

    try {
      // Build the task description with senior strategy context
      let fullTask = payload.task;
      if (payload.seniorStrategy) {
        fullTask = `OVERALL STRATEGY: ${payload.seniorStrategy}\n\nYOUR SUB-TASK:\n${payload.task}`;
      }

      const systemPrompt = this.buildPrompt(fullTask) + (payload.context || "");
      const chatMessages: ChatMessage[] = (payload.messages || []).map(m => ({
        role: m.role as ChatMessage["role"],
        content: m.content,
      }));

      const result = await streamChat(
        chatMessages,
        () => { this.updateHeartbeat(); },
        effectiveModel,
        systemPrompt,
      );

      if (result.usage) {
        await this.config.sendEvent({ usage: result.usage, model: effectiveModel });
      }

      const parsed = parseAgentResult(result.content);

      // Return sub_task_result to senior (NOT task_result to PM)
      return createMessage("sub_task_result", this.id, message.from, {
        subTaskId: payload.subTaskId,
        agentRole: this.role,
        tier: this.tier,
        actorId: this.id,
        content: result.content,
        summary: parsed.summary,
        blocked: parsed.blocked,
        blockedReason: parsed.blockedReason,
      } satisfies SubTaskResultPayload);
    } finally {
      this.clearTrackedTimer(progressTimer);
    }
  }
}

// ---- Senior Specialist Implementations ----

class SeniorArchitectActor extends SeniorSpecialistActor {
  constructor(id: string, config: SpecialistConfig) {
    super(id, "architect", config);
  }

  protected buildPrompt(task: string): string {
    const base = buildArchitectPrompt(this.config.serviceInstances);
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
  }
}

class SeniorDeveloperActor extends SeniorSpecialistActor {
  readonly instanceIndex: number;

  constructor(id: string, instanceIndex: number, config: SpecialistConfig) {
    super(id, "developer", config);
    this.instanceIndex = instanceIndex;
  }

  protected buildPrompt(task: string): string {
    const base = this.config.appContext
      ? buildAppDevDeveloperPrompt(this.config.appContext)
      : buildDeveloperPrompt();
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
  }

  async onReceive(message: ActorMessage): Promise<ActorMessage | null> {
    // Handle parallel_task from PM (existing parallel dev coordination)
    if (message.type === "parallel_task") {
      return this.handleParallelTask(message);
    }
    // Everything else (task, sub_task_result, discuss, etc.) handled by SeniorSpecialistActor
    return super.onReceive(message);
  }

  private async handleParallelTask(message: ActorMessage & { type: "parallel_task" }): Promise<ActorMessage> {
    const payload = message.payload as ParallelTaskPayload;

    const scopedTask = `${payload.task}\n\nYou are Developer #${this.instanceIndex}. You are ONLY responsible for these files:\n${payload.files.join("\n")}\n\nDo NOT create files outside your assigned scope.`;

    const result = await this.executeLLM(
      scopedTask,
      payload.messages || [],
      payload.context || ""
    );

    if (result.usage) {
      await this.config.sendEvent({
        usage: result.usage,
        model: getModelForTier(this.role, "senior", this.config.model, this.config.orgModelConfigs),
      });
    }

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

class SeniorReviewerActor extends SeniorSpecialistActor {
  constructor(id: string, config: SpecialistConfig) {
    super(id, "reviewer", config);
  }

  protected buildPrompt(task: string): string {
    const base = buildReviewerPrompt();
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
  }
}

class SeniorDevOpsActor extends SeniorSpecialistActor {
  constructor(id: string, config: SpecialistConfig) {
    super(id, "devops", config);
  }

  protected buildPrompt(task: string): string {
    const base = buildDevOpsPrompt();
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
  }
}

class SeniorUXDesignerActor extends SeniorSpecialistActor {
  constructor(id: string, config: SpecialistConfig) {
    super(id, "ux_designer", config);
  }

  protected buildPrompt(task: string): string {
    const base = buildUXDesignerPrompt();
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
  }
}

class SeniorTesterActor extends SeniorSpecialistActor {
  constructor(id: string, config: SpecialistConfig) {
    super(id, "tester", config);
  }

  protected buildPrompt(task: string): string {
    const base = buildTesterPrompt();
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
  }
}

class SeniorDBMigratorActor extends SeniorSpecialistActor {
  constructor(id: string, config: SpecialistConfig) {
    super(id, "db_migrator", config);
  }

  protected buildPrompt(task: string): string {
    const base = buildDBMigratorPrompt();
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
  }
}

class SeniorDocWriterActor extends SeniorSpecialistActor {
  constructor(id: string, config: SpecialistConfig) {
    super(id, "doc_writer", config);
  }

  protected buildPrompt(task: string): string {
    const base = buildDocWriterPrompt();
    return `${base}${this.buildPeerDiscussionSection()}\n\n--- TASK FROM PM ---\n${task}`;
  }
}

// ---- Factory ----

/**
 * Create a senior specialist actor.
 * Senior actors plan, delegate to juniors, and synthesize results.
 * They accept standard `task` messages and return `task_result` — backward compatible with PM.
 */
export function createSpecialistActor(
  role: AgentRole,
  index: number,
  config: SpecialistConfig
): Actor {
  const id = `${role}-senior-${index}`;
  switch (role) {
    case "architect":
      return new SeniorArchitectActor(id, config);
    case "developer":
      return new SeniorDeveloperActor(id, index, config);
    case "reviewer":
      return new SeniorReviewerActor(id, config);
    case "devops":
      return new SeniorDevOpsActor(id, config);
    case "ux_designer":
      return new SeniorUXDesignerActor(id, config);
    case "tester":
      return new SeniorTesterActor(id, config);
    case "db_migrator":
      return new SeniorDBMigratorActor(id, config);
    case "doc_writer":
      return new SeniorDocWriterActor(id, config);
    default:
      throw new Error(`Cannot create specialist actor for role: ${role}`);
  }
}

/**
 * Create a legacy (non-senior) specialist actor.
 * Used for backward compatibility or testing without the senior/junior hierarchy.
 */
export function createLegacySpecialistActor(
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
