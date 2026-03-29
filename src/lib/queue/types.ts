/**
 * Message Queue Types
 *
 * Defines queue names and payload types for BullMQ-based
 * background actor communication.
 */

export type QueueName =
  | "embedding"
  | "retrieval"
  | "summarizer"
  | "file-processing"
  | "file-analysis"
  | "import-orchestrator";

export interface QueueJobPayload {
  type: string;
  payload: unknown;
  requestId?: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  workerCount?: number;
}
