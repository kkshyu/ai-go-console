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
import type { BackgroundMessage } from "./types";
import { enqueueTask, enqueueAndWait, getAllQueueStats } from "../queue";
import type { QueueName, QueueStats } from "../queue/types";
import {
  BackgroundActorRegistry,
  InMemoryStateStore,
  type StateStore,
  type StatefulBackgroundActor,
} from "./stateful-background-actor";
import { EventBus } from "./event-bus";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000; // 30 seconds

/** Map background agent role to queue name */
function roleToQueue(role: BackgroundAgentRole): QueueName {
  switch (role) {
    case "embedding": return "embedding";
    case "retrieval": return "retrieval";
    case "summarizer": return "summarizer";
    case "file_processor": return "file-processing";
    case "file_analyzer": return "file-analysis";
    case "import_orchestrator": return "import-orchestrator";
    default: return role as QueueName;
  }
}

export class BackgroundActorSystem {
  private _initialized = false;
  private _registry: BackgroundActorRegistry | null = null;
  private _eventBus: EventBus | null = null;
  private _stateStore: StateStore | null = null;

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
   * Creates the stateful actor registry for persistent identity and event subscriptions.
   */
  async initialize(stateStore?: StateStore): Promise<void> {
    if (this._initialized) return;

    this._stateStore = stateStore ?? new InMemoryStateStore();
    this._eventBus = new EventBus();
    this._registry = new BackgroundActorRegistry(this._stateStore, this._eventBus);

    this._initialized = true;
    console.log("[BackgroundActorSystem] Initialized (k8s queue mode + stateful registry)");
  }

  get initialized(): boolean {
    return this._initialized;
  }

  /** Get the event bus for subscribing to system events. */
  get eventBus(): EventBus | null {
    return this._eventBus;
  }

  /** Get the stateful actor registry. */
  get registry(): BackgroundActorRegistry | null {
    return this._registry;
  }

  /**
   * Get or create a stateful background actor by role.
   * The actor has persistent state and can subscribe to events.
   */
  async getStatefulActor(role: BackgroundAgentRole): Promise<StatefulBackgroundActor | null> {
    if (!this._registry) return null;
    return this._registry.register(role);
  }

  /**
   * Request-response pattern: enqueue task to Redis, wait for worker result.
   * Automatically records success/failure on the stateful actor.
   */
  async request<TResult = unknown>(
    role: BackgroundAgentRole,
    type: BackgroundMessage["type"],
    payload: unknown,
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<TResult> {
    const queueName = roleToQueue(role);
    const actor = this._registry?.get(role);

    try {
      const result = await enqueueAndWait<TResult>(queueName, { type, payload }, timeoutMs);
      await actor?.recordSuccess();
      return result;
    } catch (err) {
      await actor?.recordFailure();
      throw err;
    }
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
   * Get health status of all stateful background actors.
   */
  getActorHealthStatus(): Record<string, { healthy: boolean; state: unknown }> {
    return this._registry?.getHealthStatus() ?? {};
  }

  /**
   * Publish an event to the background event bus.
   * Stateful actors subscribed to this event type will react.
   */
  async publishEvent(eventType: string, payload: unknown, source = "system"): Promise<void> {
    await this._eventBus?.publish(eventType, payload, source);
  }

  /**
   * Shutdown — close queue connections and cleanup stateful actors.
   */
  shutdown(): void {
    this._registry?.shutdown();
    this._eventBus?.clear();
    this._registry = null;
    this._eventBus = null;
    this._stateStore = null;
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
