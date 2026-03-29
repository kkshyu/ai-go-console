/**
 * Actor Model Core Types
 *
 * Defines the message protocol, actor state, and supervisor strategy
 * for the in-memory actor system used within SSE request lifecycle.
 *
 * Uses discriminated unions for type-safe message handling — the compiler
 * automatically narrows payload types when you switch on message.type.
 */

import type { AgentRole, BackgroundAgentRole } from "../agents/types";
import type { TokenUsage } from "../ai";

// ---- Message Protocol (Discriminated Union) ----

export type MessageType =
  | "task"             // PM dispatches work to a specialist
  | "task_result"      // Specialist returns result to PM
  | "heartbeat_ping"   // PM checks liveness
  | "heartbeat_pong"   // Actor responds alive
  | "restart"          // Supervisor restarts an actor
  | "error"            // Actor reports failure
  | "parallel_task"    // PM dispatches parallel work items
  | "parallel_result"  // One parallel developer returns result
  | "discuss"          // Worker sends discussion to another worker
  | "discuss_reply"    // Worker replies to a discussion
  | "report";          // Worker reports conclusion to PM

/** Base fields shared by all actor messages. */
interface ActorMessageBase {
  id: string;
  from: string;       // actor ID
  to: string;         // actor ID
  timestamp: number;
  traceId?: string;    // request-level trace ID for observability
}

// ---- Task Payloads ----

export interface TaskPayload {
  task: string;
  context?: string;       // artifact context from previous agents
  fileContext?: string;    // context from uploaded files
  messages?: Array<{ role: string; content: string; agentRole?: string; fileIds?: string[] }>;
}

export interface TaskResultPayload {
  agentRole: AgentRole;
  content: string;         // raw LLM output
  summary: string;
  blocked: boolean;
  blockedReason?: string;
}

export interface ParallelTaskPayload {
  groupId: string;
  taskId: string;
  task: string;
  files: string[];
  context?: string;
  messages?: Array<{ role: string; content: string; agentRole?: string }>;
}

export interface ParallelResultPayload {
  groupId: string;
  taskId: string;
  agentRole: AgentRole;
  actorId: string;
  content: string;
  summary: string;
  blocked: boolean;
  blockedReason?: string;
}

// ---- Worker-to-Worker Discussion Payloads ----

export interface DiscussPayload {
  topic: string;
  content: string;
  fromRole: AgentRole;
  context?: string;
}

export interface DiscussReplyPayload {
  topic: string;
  content: string;
  fromRole: AgentRole;
  inReplyTo: string;       // message ID of the discuss message
}

// ---- Worker-to-PM Report Payload ----

export interface ReportPayload {
  agentRole: AgentRole;
  content: string;
  summary: string;
  discussionLog?: string[]; // log of peer discussions that occurred
}

/** Structured error types for deterministic recovery. */
export type ActorErrorType =
  | "api_timeout"
  | "rate_limit"
  | "invalid_response"
  | "unknown";

export interface ErrorPayload {
  actorId: string;
  agentRole: AgentRole;
  error: string;
  errorType: ActorErrorType;
  recoverable: boolean;
}

export interface HeartbeatPayload {
  status: string;
}

// ---- Discriminated Union Messages ----

export interface TaskMessage extends ActorMessageBase {
  type: "task";
  payload: TaskPayload;
}

export interface TaskResultMessage extends ActorMessageBase {
  type: "task_result";
  payload: TaskResultPayload;
}

export interface HeartbeatPingMessage extends ActorMessageBase {
  type: "heartbeat_ping";
  payload: Record<string, never>;
}

export interface HeartbeatPongMessage extends ActorMessageBase {
  type: "heartbeat_pong";
  payload: HeartbeatPayload;
}

export interface RestartMessage extends ActorMessageBase {
  type: "restart";
  payload: { error: string };
}

export interface ErrorMessage extends ActorMessageBase {
  type: "error";
  payload: ErrorPayload;
}

export interface ParallelTaskMessage extends ActorMessageBase {
  type: "parallel_task";
  payload: ParallelTaskPayload;
}

export interface ParallelResultMessage extends ActorMessageBase {
  type: "parallel_result";
  payload: ParallelResultPayload;
}

export interface DiscussMessage extends ActorMessageBase {
  type: "discuss";
  payload: DiscussPayload;
}

export interface DiscussReplyMessage extends ActorMessageBase {
  type: "discuss_reply";
  payload: DiscussReplyPayload;
}

export interface ReportMessage extends ActorMessageBase {
  type: "report";
  payload: ReportPayload;
}

/** Discriminated union of all actor messages — switch on `type` for automatic payload narrowing. */
export type ActorMessage =
  | TaskMessage
  | TaskResultMessage
  | HeartbeatPingMessage
  | HeartbeatPongMessage
  | RestartMessage
  | ErrorMessage
  | ParallelTaskMessage
  | ParallelResultMessage
  | DiscussMessage
  | DiscussReplyMessage
  | ReportMessage;

// ---- Actor State ----

export type ActorStatus = "idle" | "processing" | "waiting" | "dead" | "restarting";

export interface ActorState {
  id: string;
  role: AgentRole;
  status: ActorStatus;
  lastHeartbeat: number;   // timestamp of last pong
  restartCount: number;
  maxRestarts: number;
}

// ---- Supervisor Strategy ----

export interface SupervisorStrategy {
  type: "one-for-one";
  maxRestarts: number;          // per actor
  withinMs: number;             // restart window
  heartbeatIntervalMs: number;
  heartbeatTimeoutMs: number;
}

export const DEFAULT_SUPERVISOR_STRATEGY: SupervisorStrategy = {
  type: "one-for-one",
  maxRestarts: 2,
  withinMs: 60_000,
  heartbeatIntervalMs: 15_000,
  heartbeatTimeoutMs: 120_000,
};

// ---- Background Actor Types ----

export type BackgroundMessageType =
  | "embed_request"
  | "embed_result"
  | "retrieve_request"
  | "retrieve_result"
  | "summarize_request"
  | "summarize_result"
  | "process_file"
  | "process_file_result"
  | "analyze_file"
  | "analyze_file_result"
  | "validate_code"
  | "validate_code_result"
  | "resolve_deps"
  | "resolve_deps_result"
  | "template_lookup"
  | "template_lookup_result"
  | "progress_init"
  | "progress_update"
  | "progress_query"
  | "progress_result"
  | "generate_and_start"
  | "generate_and_start_result";

export interface BackgroundMessage {
  id: string;
  type: BackgroundMessageType;
  requestId: string;        // unique per request-response pair
  payload: unknown;
  timestamp: number;
}

export interface EmbedRequestPayload {
  sourceType: "artifact" | "agent_output";
  sourceId: string;
  conversationId: string;
  agentRole: string;
  content: string;
}

export interface EmbedResultPayload {
  sourceId: string;
  chunksStored: number;
  success: boolean;
}

export interface RetrieveRequestPayload {
  conversationId: string;
  query: string;
  maxChars?: number;
  sourceType?: string;
}

export interface RetrieveResultPayload {
  context: string;
  chunks: Array<{ content: string; similarity: number; agentRole: string }>;
}

export interface SummarizeRequestPayload {
  content: string;
  agentRole: string;
  locale: string;
}

export interface SummarizeResultPayload {
  content: string;
  usage: TokenUsage | null;
}

export interface ProcessFilePayload {
  fileId: string;
  storagePath: string;
  mimeType: string;
  fileName: string;
  conversationId?: string;
}

export interface ProcessFileResultPayload {
  fileId: string;
  extractedText: string;
  success: boolean;
}

export interface AnalyzeFilePayload {
  fileId: string;
  storagePath: string;
  mimeType: string;
  fileName: string;
  extractedText?: string;
}

export interface AnalyzeFileResultPayload {
  fileId: string;
  summary: string;
  success: boolean;
}

export interface ActorStats {
  role: BackgroundAgentRole;
  totalProcessed: number;
  totalFailed: number;
  consecutiveFailures: number;
  lastActivityAt: number;
  restartCount: number;
  isHealthy: boolean;
}

// ---- Helper ----

let _msgCounter = 0;

/** Create a type-safe actor message. The overloads ensure payload matches the message type. */
export function createMessage(type: "task", from: string, to: string, payload: TaskPayload, traceId?: string): TaskMessage;
export function createMessage(type: "task_result", from: string, to: string, payload: TaskResultPayload, traceId?: string): TaskResultMessage;
export function createMessage(type: "heartbeat_ping", from: string, to: string, payload: Record<string, never>, traceId?: string): HeartbeatPingMessage;
export function createMessage(type: "heartbeat_pong", from: string, to: string, payload: HeartbeatPayload, traceId?: string): HeartbeatPongMessage;
export function createMessage(type: "restart", from: string, to: string, payload: { error: string }, traceId?: string): RestartMessage;
export function createMessage(type: "error", from: string, to: string, payload: ErrorPayload, traceId?: string): ErrorMessage;
export function createMessage(type: "parallel_task", from: string, to: string, payload: ParallelTaskPayload, traceId?: string): ParallelTaskMessage;
export function createMessage(type: "parallel_result", from: string, to: string, payload: ParallelResultPayload, traceId?: string): ParallelResultMessage;
export function createMessage(type: "discuss", from: string, to: string, payload: DiscussPayload, traceId?: string): DiscussMessage;
export function createMessage(type: "discuss_reply", from: string, to: string, payload: DiscussReplyPayload, traceId?: string): DiscussReplyMessage;
export function createMessage(type: "report", from: string, to: string, payload: ReportPayload, traceId?: string): ReportMessage;
export function createMessage(
  type: MessageType,
  from: string,
  to: string,
  payload: unknown,
  traceId?: string,
): ActorMessage {
  return {
    id: `msg-${Date.now()}-${++_msgCounter}`,
    type,
    from,
    to,
    payload,
    timestamp: Date.now(),
    ...(traceId && { traceId }),
  } as ActorMessage;
}
