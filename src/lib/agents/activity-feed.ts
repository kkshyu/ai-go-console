/**
 * Activity Feed — Redis ZSET-backed event stream
 *
 * Stores agent/queue activity events with 24h retention.
 * Score = event timestamp (epoch ms) for precise time-range queries.
 */

import { getRedis } from "@/lib/redis";
import {
  REDIS_ACTIVITY_KEY,
  ACTIVITY_RETENTION_MS,
  MESSAGE_MAX_LEN,
  FAILED_REASON_MAX_LEN,
  META_WHITELIST,
  type ActivityEvent,
  type ActivitySource,
  type ActivityLevel,
} from "./activity-types";

// ── Internal Helpers ────────────────────────────────────────────────────────

let _eventCounter = 0;

function truncate(s: string | undefined, max: number): string | undefined {
  if (!s) return undefined;
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function sanitizeMeta(
  raw?: Record<string, unknown>,
): Record<string, string | number | boolean> | undefined {
  if (!raw) return undefined;
  const out: Record<string, string | number | boolean> = {};
  let hasKeys = false;
  for (const key of Object.keys(raw)) {
    if (!META_WHITELIST.has(key)) continue;
    const val = raw[key];
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
      out[key] = val;
      hasKeys = true;
    }
  }
  return hasKeys ? out : undefined;
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface AppendActivityInput {
  source: ActivitySource;
  level: ActivityLevel;
  actorId?: string;
  traceId?: string;
  queueName?: string;
  jobId?: string;
  message: string;
  failedReason?: string;
  meta?: Record<string, unknown>;
}

/**
 * Append an activity event to the feed.
 * Non-blocking: errors are swallowed silently (degraded mode).
 */
export async function appendActivity(input: AppendActivityInput): Promise<void> {
  try {
    const now = Date.now();
    const event: ActivityEvent = {
      id: `evt-${now}-${process.pid}-${++_eventCounter}`,
      timestamp: now,
      source: input.source,
      level: input.level,
      actorId: input.actorId,
      traceId: input.traceId,
      queueName: input.queueName,
      jobId: input.jobId,
      message: truncate(input.message, MESSAGE_MAX_LEN)!,
      failedReason: truncate(input.failedReason, FAILED_REASON_MAX_LEN),
      meta: sanitizeMeta(input.meta),
    };

    const redis = getRedis();
    await redis.zadd(REDIS_ACTIVITY_KEY, now, JSON.stringify(event));
  } catch {
    // degraded: silently drop
  }
}

export interface ReadActivityQuery {
  limit?: number;
  source?: ActivitySource;
  level?: ActivityLevel;
}

/**
 * Read recent activity events (newest first, within 24h window).
 * Returns [] on Redis failure.
 */
export async function readActivityFeed(
  query: ReadActivityQuery = {},
): Promise<ActivityEvent[]> {
  try {
    const { limit = 100, source, level } = query;
    const now = Date.now();
    const minScore = now - ACTIVITY_RETENTION_MS;

    const redis = getRedis();
    // Fetch more than limit to account for client-side filtering
    const fetchLimit = source || level ? limit * 3 : limit;
    const raw = await redis.zrevrangebyscore(
      REDIS_ACTIVITY_KEY,
      now,
      minScore,
      "LIMIT",
      0,
      fetchLimit,
    );

    let events: ActivityEvent[] = raw.map((s) => JSON.parse(s));

    if (source) {
      events = events.filter((e) => e.source === source);
    }
    if (level) {
      events = events.filter((e) => e.level === level);
    }

    return events.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Read events in a time range (oldest first). Used by the archiver.
 */
export async function readActivityRange(
  minMs: number,
  maxMs: number,
): Promise<ActivityEvent[]> {
  const redis = getRedis();
  const raw = await redis.zrangebyscore(REDIS_ACTIVITY_KEY, minMs, maxMs);
  return raw.map((s) => JSON.parse(s));
}

/**
 * Remove events older than the given timestamp.
 * Returns the count of removed entries.
 */
export async function removeActivityBefore(beforeMs: number): Promise<number> {
  const redis = getRedis();
  return redis.zremrangebyscore(REDIS_ACTIVITY_KEY, "-inf", beforeMs);
}
