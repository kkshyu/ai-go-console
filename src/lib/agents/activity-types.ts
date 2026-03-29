/**
 * Activity Feed Types & Constants
 *
 * Shared definitions for the agent observability activity feed.
 */

export type ActivitySource = "actor" | "queue" | "system";
export type ActivityLevel = "info" | "warn" | "error";

export interface ActivityEvent {
  id: string;
  timestamp: number; // epoch ms — also used as ZSET score
  source: ActivitySource;
  level: ActivityLevel;
  actorId?: string;
  traceId?: string;
  queueName?: string;
  jobId?: string;
  message: string;
  failedReason?: string;
  meta?: Record<string, string | number | boolean>;
}

// ── Redis Keys ──────────────────────────────────────────────────────────────

export const REDIS_ACTIVITY_KEY = "agent_activity";
export const REDIS_ARCHIVE_LOCK_KEY = "agent_activity_archive_lock";

// ── Retention ───────────────────────────────────────────────────────────────

export const ACTIVITY_RETENTION_MS = 86_400_000; // 24 hours

// ── Sanitization Limits ─────────────────────────────────────────────────────

export const MESSAGE_MAX_LEN = 500;
export const FAILED_REASON_MAX_LEN = 300;

export const META_WHITELIST = new Set([
  "durationMs",
  "attemptsMade",
  "maxAttempts",
  "agentRole",
  "sessionId",
  "conversationId",
  "model",
  "queueName",
  "status",
  "workerPid",
]);
