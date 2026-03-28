/**
 * Background Actor System
 *
 * Global singleton that manages background actors (Embedding, Retrieval, Summarizer).
 * These actors persist across HTTP requests and are initialized once at server startup.
 *
 * Provides three communication patterns:
 * - request(): Request-response with timeout
 * - fireAndForget(): Fire-and-forget (no response expected)
 * - requestParallel(): Fan-out to worker pool, collect all results
 *
 * Supports parallel processing via WorkerPool for high-throughput roles.
 * Includes health monitoring with automatic actor/pool restart on failures.
 */

import type { BackgroundAgentRole } from "../agents/types";
import type { BackgroundMessage, ActorStats } from "./types";
import { BackgroundActor, createBackgroundMessage } from "./background-actor";
import { WorkerPool, type WorkerPoolConfig, type WorkerPoolStats } from "./worker-pool";

const HEALTH_CHECK_INTERVAL_MS = 30_000; // 30 seconds
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000; // 30 seconds

type ActorFactory = (role: BackgroundAgentRole) => BackgroundActor;

export class BackgroundActorSystem {
  private actors = new Map<BackgroundAgentRole, BackgroundActor>();
  private pools = new Map<BackgroundAgentRole, WorkerPool>();
  private actorFactory: ActorFactory | null = null;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private _initialized = false;

  /**
   * Register the factory for creating background actors.
   * Must be called before initialize().
   */
  setActorFactory(factory: ActorFactory): void {
    this.actorFactory = factory;
  }

  /**
   * Initialize all background actors and start health monitoring.
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;
    if (!this.actorFactory) {
      throw new Error("BackgroundActorSystem: setActorFactory() must be called before initialize()");
    }

    const roles: BackgroundAgentRole[] = ["embedding", "retrieval", "summarizer"];
    for (const role of roles) {
      await this.spawnActor(role);
    }

    this.startHealthMonitor();
    this._initialized = true;
    console.log("[BackgroundActorSystem] Initialized with actors:", roles.join(", "));
  }

  /**
   * Check if the system is initialized.
   */
  get initialized(): boolean {
    return this._initialized;
  }

  /**
   * Request-response pattern: send a message and wait for the result.
   * Routes to worker pool if available, otherwise to single actor.
   * Throws on timeout or actor failure.
   */
  async request<TResult = unknown>(
    role: BackgroundAgentRole,
    type: BackgroundMessage["type"],
    payload: unknown,
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<TResult> {
    // Try worker pool first
    const pool = this.pools.get(role);
    if (pool) {
      return this.requestFromPool<TResult>(pool, type, payload, timeoutMs);
    }

    const actor = this.actors.get(role);
    if (!actor) {
      throw new Error(`BackgroundActorSystem: No actor for role "${role}"`);
    }

    // If actor is unhealthy, try restart before failing
    if (!actor.isHealthy()) {
      console.warn(`[BackgroundActorSystem] Actor "${role}" unhealthy, attempting restart`);
      await this.restartActor(role);
      const restarted = this.actors.get(role);
      if (!restarted || !restarted.isHealthy()) {
        throw new Error(`BackgroundActorSystem: Actor "${role}" failed to restart`);
      }
    }

    const message = createBackgroundMessage(type, payload);

    return new Promise<TResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`BackgroundActorSystem: Request to "${role}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      actor.enqueue(message, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value as TResult);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
    });
  }

  /**
   * Fire-and-forget: send a message without waiting for result.
   * Routes to worker pool if available, otherwise to single actor.
   * Errors are logged but not thrown.
   */
  fireAndForget(
    role: BackgroundAgentRole,
    type: BackgroundMessage["type"],
    payload: unknown,
  ): void {
    // Try worker pool first
    const pool = this.pools.get(role);
    if (pool) {
      if (!pool.isHealthy()) {
        pool.restartUnhealthy().catch((err) =>
          console.error(`[BackgroundActorSystem] Failed to restart pool "${role}":`, err),
        );
      }
      const message = createBackgroundMessage(type, payload);
      pool.enqueue(message);
      return;
    }

    const actor = this.actors.get(role);
    if (!actor) {
      console.warn(`[BackgroundActorSystem] No actor for role "${role}", dropping message`);
      return;
    }

    if (!actor.isHealthy()) {
      console.warn(`[BackgroundActorSystem] Actor "${role}" unhealthy, queuing restart`);
      this.restartActor(role).catch((err) =>
        console.error(`[BackgroundActorSystem] Failed to restart "${role}":`, err),
      );
    }

    const message = createBackgroundMessage(type, payload);
    actor.enqueue(message);
  }

  /**
   * Fan-out: send the same message to ALL workers in a pool simultaneously.
   * Collects and returns all results. Useful for map-reduce patterns.
   * Falls back to single request if no pool exists.
   */
  async requestParallel<TResult = unknown>(
    role: BackgroundAgentRole,
    type: BackgroundMessage["type"],
    payloads: unknown[],
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<TResult[]> {
    const pool = this.pools.get(role);
    if (pool) {
      // Distribute payloads across pool workers
      return Promise.all(
        payloads.map((payload) =>
          this.requestFromPool<TResult>(pool, type, payload, timeoutMs),
        ),
      );
    }

    // Fallback: process sequentially with single actor
    const results: TResult[] = [];
    for (const payload of payloads) {
      const result = await this.request<TResult>(role, type, payload, timeoutMs);
      results.push(result);
    }
    return results;
  }

  // ---- Worker Pool Management ----

  /**
   * Register a worker pool for a role. Replaces any existing single actor.
   * Pool workers are created using the provided factory.
   */
  async registerPool(config: WorkerPoolConfig): Promise<void> {
    // Remove existing single actor if present
    const existing = this.actors.get(config.role);
    if (existing) {
      existing.stop();
      this.actors.delete(config.role);
    }

    const pool = new WorkerPool(config);
    await pool.start();
    this.pools.set(config.role, pool);
    console.log(`[BackgroundActorSystem] Registered pool for "${config.role}" with ${config.size} workers`);
  }

  /**
   * Scale an existing worker pool to a new size.
   */
  async scalePool(role: BackgroundAgentRole, newSize: number): Promise<void> {
    const pool = this.pools.get(role);
    if (!pool) {
      console.warn(`[BackgroundActorSystem] No pool for role "${role}" to scale`);
      return;
    }
    await pool.scale(newSize);
  }

  /**
   * Get stats for a worker pool.
   */
  getPoolStats(role: BackgroundAgentRole): WorkerPoolStats | null {
    return this.pools.get(role)?.getPoolStats() ?? null;
  }

  private async requestFromPool<TResult>(
    pool: WorkerPool,
    type: BackgroundMessage["type"],
    payload: unknown,
    timeoutMs: number,
  ): Promise<TResult> {
    if (!pool.isHealthy()) {
      console.warn(`[BackgroundActorSystem] Pool "${pool.role}" unhealthy, restarting workers`);
      await pool.restartUnhealthy();
      if (!pool.isHealthy()) {
        throw new Error(`BackgroundActorSystem: Pool "${pool.role}" failed to recover`);
      }
    }

    const message = createBackgroundMessage(type, payload);

    return new Promise<TResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`BackgroundActorSystem: Pool request to "${pool.role}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      pool.enqueue(message, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value as TResult);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
    });
  }

  /**
   * Get health stats for all background actors and pools.
   */
  getSystemHealth(): Partial<Record<BackgroundAgentRole, ActorStats>> {
    const health: Partial<Record<BackgroundAgentRole, ActorStats>> = {};
    for (const [role, actor] of this.actors) {
      health[role] = actor.getStats();
    }
    for (const [role, pool] of this.pools) {
      health[role] = pool.getStats();
    }
    return health;
  }

  /**
   * Register and spawn a new actor after initialization.
   * Used for late-registration of server-only actors (e.g., file processors).
   */
  async registerActor(actor: BackgroundActor): Promise<void> {
    if (this.actors.has(actor.role)) return; // Already registered
    await actor.start();
    this.actors.set(actor.role, actor);
  }

  /**
   * Check if an actor or pool for a given role exists.
   */
  hasActor(role: BackgroundAgentRole): boolean {
    return this.actors.has(role) || this.pools.has(role);
  }

  /**
   * Shutdown all actors, pools, and stop health monitoring.
   */
  shutdown(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    for (const actor of this.actors.values()) {
      actor.stop();
    }
    this.actors.clear();

    for (const pool of this.pools.values()) {
      pool.stop();
    }
    this.pools.clear();

    this._initialized = false;
    console.log("[BackgroundActorSystem] Shutdown complete");
  }

  // ---- Internal ----

  private async spawnActor(role: BackgroundAgentRole): Promise<void> {
    if (!this.actorFactory) {
      throw new Error("BackgroundActorSystem: No actor factory set");
    }

    const actor = this.actorFactory(role);
    await actor.start();
    this.actors.set(role, actor);
  }

  private async restartActor(role: BackgroundAgentRole): Promise<void> {
    const old = this.actors.get(role);
    if (old) {
      old.stop();
      this.actors.delete(role);
    }

    await this.spawnActor(role);

    const newActor = this.actors.get(role);
    if (newActor) {
      newActor.incrementRestartCount();
      console.log(`[BackgroundActorSystem] Restarted actor "${role}"`);
    }
  }

  private startHealthMonitor(): void {
    this.healthCheckTimer = setInterval(async () => {
      // Check single actors
      for (const [role, actor] of this.actors) {
        if (!actor.isHealthy()) {
          console.warn(`[BackgroundActorSystem] Health check: "${role}" unhealthy, restarting`);
          try {
            await this.restartActor(role);
          } catch (err) {
            console.error(`[BackgroundActorSystem] Failed to restart "${role}":`, err);
          }
        }
      }
      // Check worker pools
      for (const [role, pool] of this.pools) {
        if (!pool.isHealthy()) {
          console.warn(`[BackgroundActorSystem] Health check: pool "${role}" unhealthy, restarting workers`);
          try {
            await pool.restartUnhealthy();
          } catch (err) {
            console.error(`[BackgroundActorSystem] Failed to restart pool "${role}":`, err);
          }
        }
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }
}

// ---- Global Singleton ----

export const backgroundSystem = new BackgroundActorSystem();

let _ensured = false;

/**
 * Ensure the background system is initialized.
 * Safe to call multiple times — only initializes once.
 * Must call backgroundSystem.setActorFactory() before first call.
 */
export async function ensureBackgroundSystem(): Promise<BackgroundActorSystem> {
  if (!_ensured && !backgroundSystem.initialized) {
    // Import actor implementations lazily to avoid circular deps
    const { EmbeddingActor } = await import("./embedding-actor");
    const { RetrievalActor } = await import("./retrieval-actor");
    const { SummarizerActor } = await import("./summarizer-actor");

    backgroundSystem.setActorFactory((role) => {
      switch (role) {
        case "embedding":
          return new EmbeddingActor(`embedding-${Date.now()}`);
        case "retrieval":
          return new RetrievalActor(`retrieval-${Date.now()}`);
        case "summarizer":
          return new SummarizerActor(`summarizer-${Date.now()}`);
        default:
          throw new Error(`Unknown background agent role: ${role}`);
      }
    });

    await backgroundSystem.initialize();
    _ensured = true;
  }
  return backgroundSystem;
}
