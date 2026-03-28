/**
 * Actor Model Core Types
 *
 * Defines the message protocol, actor state, and supervisor strategy
 * for the in-memory actor system used within SSE request lifecycle.
 */

import type { AgentRole, BackgroundAgentRole } from "../agents/types";
import type { TokenUsage } from "../ai";

// ---- Message Protocol ----

export type MessageType =
  | "task"             // PM dispatches work to a specialist
  | "task_result"      // Specialist returns result to PM
  | "heartbeat_ping"   // PM checks liveness
  | "heartbeat_pong"   // Actor responds alive
  | "restart"          // Supervisor restarts an actor
  | "error"            // Actor reports failure
  | "parallel_task"    // PM dispatches parallel work items
  | "parallel_result"; // One parallel developer returns result

export interface ActorMessage {
  id: string;
  type: MessageType;
  from: string;       // actor ID
  to: string;         // actor ID
  payload: unknown;
  timestamp: number;
}

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

// ---- Task Payloads ----

export interface TaskPayload {
  task: string;
  context?: string;       // artifact context from previous agents
  messages?: Array<{ role: string; content: string; agentRole?: string }>;
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
  tasks: Array<{
    taskId: string;
    task: string;
    files: string[];
  }>;
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

export interface ErrorPayload {
  actorId: string;
  agentRole: AgentRole;
  error: string;
  recoverable: boolean;
}

// ---- Background Actor Types ----

export type BackgroundMessageType =
  | "embed_request"
  | "embed_result"
  | "retrieve_request"
  | "retrieve_result"
  | "summarize_request"
  | "summarize_result";

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
  pipelineId: string;
  agentRole: string;
  content: string;
}

export interface EmbedResultPayload {
  sourceId: string;
  chunksStored: number;
  success: boolean;
}

export interface RetrieveRequestPayload {
  pipelineId: string;
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

export function createMessage(
  type: MessageType,
  from: string,
  to: string,
  payload: unknown
): ActorMessage {
  return {
    id: `msg-${Date.now()}-${++_msgCounter}`,
    type,
    from,
    to,
    payload,
    timestamp: Date.now(),
  };
}
