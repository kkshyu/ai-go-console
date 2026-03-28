/**
 * Structured Logger for Actor System
 *
 * Provides consistent, structured logging with traceId for correlating
 * all actor messages within a single user request.
 */

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

  const prefix = `[Actor:${actorId}]${traceId ? `[trace:${traceId}]` : ""}`;

  switch (level) {
    case "error":
      console.error(prefix, message, extra ? JSON.stringify(extra) : "");
      break;
    case "warn":
      console.warn(prefix, message, extra ? JSON.stringify(extra) : "");
      break;
    default:
      console.log(prefix, message, extra ? JSON.stringify(extra) : "");
  }

  // Future: emit to OpenTelemetry, Datadog, etc.
  void entry;
}

/** Generate a unique trace ID for a request. */
export function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
