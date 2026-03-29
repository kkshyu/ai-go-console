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

export const ALL_QUEUE_NAMES: QueueName[] = [
  "embedding",
  "retrieval",
  "summarizer",
  "file-processing",
  "file-analysis",
  "import-orchestrator",
];

export interface QueueJobPayload {
  type: string;
  payload: unknown;
  requestId?: string;
  /** Optional idempotency key — if a job with this key is already pending/active, the duplicate is silently skipped. */
  idempotencyKey?: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  workerCount?: number;
  /** Average processing time (ms) of the last N completed jobs, if available. */
  avgProcessingTimeMs?: number;
  /** Oldest waiting job age in ms — indicates backpressure. */
  oldestWaitingAgeMs?: number;
}
