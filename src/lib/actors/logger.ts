/**
 * Structured Logger for Actor System
 *
 * Provides consistent, structured logging with traceId for correlating
 * all actor messages within a single user request.
 */

import { appendActivity } from "@/lib/agents/activity-feed";

export type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  actorId: string;
  traceId?: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Emit a structured log entry for the actor system.
 * All logs include actorId and optional traceId for request correlation.
 * Output is JSON for log aggregator compatibility.
 */
export function actorLog(
  level: LogLevel,
  actorId: string,
  message: string,
  traceId?: string,
  extra?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    level,
    actorId,
    message,
    timestamp: new Date().toISOString(),
    ...(traceId && { traceId }),
    ...extra,
  };

  const jsonLine = JSON.stringify(entry);

  switch (level) {
    case "error":
      console.error(jsonLine);
      break;
    case "warn":
      console.warn(jsonLine);
      break;
    default:
      console.log(jsonLine);
  }

  appendActivity({
    source: "actor",
    level,
    actorId,
    traceId,
    message,
    meta: extra,
  }).catch(() => {});
}

/** Start a timer and return a function to stop it and get duration in ms. */
export function startTimer(
  label: string,
  actorId: string,
  traceId?: string,
): () => number {
  const start = performance.now();
  return () => {
    const durationMs = Math.round(performance.now() - start);
    actorLog("info", actorId, `${label} completed`, traceId, {
      durationMs,
      metric: label,
    });
    return durationMs;
  };
}

/** Emit a metric event as a structured JSON log line. */
export function emitMetric(
  name: string,
  value: number,
  actorId: string,
  traceId?: string,
  tags?: Record<string, string>,
): void {
  actorLog("info", actorId, `metric:${name}`, traceId, {
    metric: { name, value, ...tags },
  });
}

/** Generate a unique trace ID for a request. */
export function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
