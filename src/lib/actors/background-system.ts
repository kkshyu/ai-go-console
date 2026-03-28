/**
 * Background Actor System
 *
 * Delegates background tasks (Embedding, Retrieval, Summarizer, File Processing)
 * to k8s Worker pods via Redis-backed BullMQ queues.
 *
 * The public API is preserved so all consumers (chat routes, etc.) work unchanged.
 *
 * Communication patterns:
 * - request(): Enqueue task and wait for k8s worker to return result
 * - fireAndForget(): Enqueue task without waiting
 * - requestParallel(): Fan-out multiple payloads to the same queue concurrently
 *
 * Parallelization is handled at the queue level — BullMQ workers process
 * jobs concurrently based on their concurrency setting, so fan-out simply
 * means enqueueing multiple jobs simultaneously.
 */

import type { BackgroundAgentRole } from "../agents/types";
import type { BackgroundMessage, ActorStats } from "./types";
import { enqueueTask, enqueueAndWait, getAllQueueStats } from "../queue";
import type { QueueName, QueueStats } from "../queue/types";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000; // 30 seconds

/** Map background agent role to queue name */
function roleToQueue(role: BackgroundAgentRole): QueueName {
  switch (role) {
    case "embedding": return "embedding";
    case "retrieval": return "retrieval";
    case "summarizer": return "summarizer";
    case "file-processor": return "file-processing";
    case "file-analyzer": return "file-analysis";
    default: return role as QueueName;
  }
}

export class BackgroundActorSystem {
  private _initialized = false;

  /**
   * Register the factory for creating background actors.
   * No-op in k8s mode — actors run in worker pods, not in-process.
   * Kept for API compatibility.
   */
  setActorFactory(_factory: unknown): void {
    // No-op: actors are managed by k8s worker pods
  }

  /**
   * Initialize the queue-based background system.
   * Simply marks as initialized since Redis handles the actual queuing.
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;
    console.log("[BackgroundActorSystem] Initialized (k8s queue mode)");
  }

  get initialized(): boolean {
    return this._initialized;
  }

  /**
   * Request-response pattern: enqueue task to Redis, wait for worker result.
   */
  async request<TResult = unknown>(
    role: BackgroundAgentRole,
    type: BackgroundMessage["type"],
    payload: unknown,
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<TResult> {
    const queueName = roleToQueue(role);
    return enqueueAndWait<TResult>(queueName, { type, payload }, timeoutMs);
  }

  /**
   * Fire-and-forget: enqueue task without waiting for result.
   */
  fireAndForget(
    role: BackgroundAgentRole,
    type: BackgroundMessage["type"],
    payload: unknown,
  ): void {
    const queueName = roleToQueue(role);
    enqueueTask(queueName, { type, payload }).catch((err) =>
      console.error(`[BackgroundActorSystem] Failed to enqueue to "${role}":`, err),
    );
  }

  /**
   * Fan-out: enqueue multiple payloads to the same queue concurrently.
   * BullMQ workers process them in parallel based on their concurrency setting.
   * Collects and returns all results. Useful for map-reduce patterns.
   *
   * Example: embed 10 chunks in parallel
   *   await system.requestParallel("embedding", "embed_request", chunks);
   */
  async requestParallel<TResult = unknown>(
    role: BackgroundAgentRole,
    type: BackgroundMessage["type"],
    payloads: unknown[],
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<TResult[]> {
    const queueName = roleToQueue(role);
    return Promise.all(
      payloads.map((payload) =>
        enqueueAndWait<TResult>(queueName, { type, payload }, timeoutMs),
      ),
    );
  }

  /**
   * Get health stats from Redis queues.
   */
  async getSystemHealth(): Promise<Record<string, QueueStats>> {
    return getAllQueueStats();
  }

  /**
   * Register a new actor.
   * No-op in k8s mode — new actor types are added to the worker deployment.
   */
  async registerActor(_actor: unknown): Promise<void> {
    // No-op
  }

  /**
   * Check if a queue for a given role exists.
   * Always returns true since queues are created on demand.
   */
  hasActor(_role: BackgroundAgentRole): boolean {
    return true;
  }

  /**
   * Shutdown — close queue connections.
   */
  shutdown(): void {
    this._initialized = false;
    console.log("[BackgroundActorSystem] Shutdown (k8s queue mode)");
  }
}

// ---- Global Singleton ----

export const backgroundSystem = new BackgroundActorSystem();

let _ensured = false;

/**
 * Ensure the background system is initialized.
 * In k8s mode, simply marks as initialized (no in-process actors to spawn).
 */
export async function ensureBackgroundSystem(): Promise<BackgroundActorSystem> {
  if (!_ensured && !backgroundSystem.initialized) {
    await backgroundSystem.initialize();
    _ensured = true;
  }
  return backgroundSystem;
}
