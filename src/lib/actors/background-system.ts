/**
 * Background Actor System
 *
 * Global singleton that manages background actors (Embedding, Retrieval, Summarizer).
 * These actors persist across HTTP requests and are initialized once at server startup.
 *
 * Provides two communication patterns:
 * - request(): Request-response with timeout
 * - fireAndForget(): Fire-and-forget (no response expected)
 *
 * Includes health monitoring with automatic actor restart on consecutive failures.
 */

import type { BackgroundAgentRole } from "../agents/types";
import type { BackgroundMessage, ActorStats } from "./types";
import { BackgroundActor, createBackgroundMessage } from "./background-actor";

const HEALTH_CHECK_INTERVAL_MS = 30_000; // 30 seconds
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000; // 30 seconds

type ActorFactory = (role: BackgroundAgentRole) => BackgroundActor;

export class BackgroundActorSystem {
  private actors = new Map<BackgroundAgentRole, BackgroundActor>();
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
   * Throws on timeout or actor failure.
   */
  async request<TResult = unknown>(
    role: BackgroundAgentRole,
    type: BackgroundMessage["type"],
    payload: unknown,
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<TResult> {
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
   * Errors are logged but not thrown.
   */
  fireAndForget(
    role: BackgroundAgentRole,
    type: BackgroundMessage["type"],
    payload: unknown,
  ): void {
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
   * Get health stats for all background actors.
   */
  getSystemHealth(): Record<BackgroundAgentRole, ActorStats> {
    const health = {} as Record<BackgroundAgentRole, ActorStats>;
    for (const [role, actor] of this.actors) {
      health[role] = actor.getStats();
    }
    return health;
  }

  /**
   * Shutdown all actors and stop health monitoring.
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
