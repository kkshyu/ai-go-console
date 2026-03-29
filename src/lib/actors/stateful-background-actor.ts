/**
 * Stateful Background Actor
 *
 * Wraps the existing BullMQ queue-based background system with:
 * 1. Redis-persisted state per actor role (survives restarts)
 * 2. Event-driven subscriptions for proactive behavior
 * 3. Health tracking with activity timestamps
 *
 * This is Phase 1+2 of background agent 常駐化:
 * - Phase 1: State persistence via Redis hash per role
 * - Phase 2: EventBus subscriptions for proactive reactions
 *
 * Background actors are still BullMQ workers at the execution level,
 * but now have persistent identity, memory, and the ability to react
 * to system events without being explicitly called.
 */

import type { BackgroundAgentRole } from "../agents/types";
import type { BackgroundMessage } from "./types";
import { EventBus, type BusEvent } from "./event-bus";

// ---- State Types ----

export interface BackgroundActorState {
  role: BackgroundAgentRole;
  lastActivityAt: number;
  totalProcessed: number;
  totalFailed: number;
  metadata: Record<string, unknown>;
}

// ---- State Store Interface (Redis-backed in production) ----

export interface StateStore {
  get(key: string): Promise<Record<string, unknown> | null>;
  set(key: string, value: Record<string, unknown>): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * In-memory state store for development / testing.
 * Production should use RedisStateStore.
 */
export class InMemoryStateStore implements StateStore {
  private store = new Map<string, Record<string, unknown>>();

  async get(key: string): Promise<Record<string, unknown> | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: Record<string, unknown>): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// ---- Event Subscription ----

export interface EventSubscription {
  eventType: string;
  handler: (event: BusEvent) => void | Promise<void>;
}

// ---- Stateful Background Actor ----

export class StatefulBackgroundActor {
  readonly role: BackgroundAgentRole;
  private state: BackgroundActorState;
  private stateStore: StateStore;
  private eventBus: EventBus | null = null;
  private subscriptions: Array<() => void> = [];
  private _initialized = false;

  constructor(role: BackgroundAgentRole, stateStore: StateStore) {
    this.role = role;
    this.stateStore = stateStore;
    this.state = {
      role,
      lastActivityAt: 0,
      totalProcessed: 0,
      totalFailed: 0,
      metadata: {},
    };
  }

  get initialized(): boolean {
    return this._initialized;
  }

  /** Initialize the actor by loading persisted state from the store. */
  async initialize(): Promise<void> {
    if (this._initialized) return;

    const persisted = await this.stateStore.get(`bg-actor:${this.role}`);
    if (persisted) {
      this.state = {
        role: this.role,
        lastActivityAt: (persisted.lastActivityAt as number) ?? 0,
        totalProcessed: (persisted.totalProcessed as number) ?? 0,
        totalFailed: (persisted.totalFailed as number) ?? 0,
        metadata: (persisted.metadata as Record<string, unknown>) ?? {},
      };
    }

    this._initialized = true;
  }

  /** Get the current actor state (read-only snapshot). */
  getState(): Readonly<BackgroundActorState> {
    return { ...this.state };
  }

  /** Update metadata for this actor. */
  async setMetadata(key: string, value: unknown): Promise<void> {
    this.state.metadata[key] = value;
    await this.persistState();
  }

  /** Get a metadata value. */
  getMetadata<T = unknown>(key: string): T | undefined {
    return this.state.metadata[key] as T | undefined;
  }

  /**
   * Record that a job was processed successfully.
   * Call this from the BullMQ worker after processing a job.
   */
  async recordSuccess(): Promise<void> {
    this.state.totalProcessed++;
    this.state.lastActivityAt = Date.now();
    await this.persistState();
  }

  /**
   * Record that a job failed.
   * Call this from the BullMQ worker on job failure.
   */
  async recordFailure(): Promise<void> {
    this.state.totalFailed++;
    this.state.lastActivityAt = Date.now();
    await this.persistState();
  }

  /** Check if the actor has been active recently. */
  isHealthy(maxIdleMs = 300_000): boolean {
    if (this.state.lastActivityAt === 0) return true; // never started = not unhealthy
    return Date.now() - this.state.lastActivityAt < maxIdleMs;
  }

  // ---- Event Subscriptions (Phase 2) ----

  /**
   * Attach an event bus for proactive behavior.
   * The actor can subscribe to system events and react without being explicitly called.
   */
  attachEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Subscribe to a system event.
   * Returns an unsubscribe function.
   *
   * Example: embedding actor subscribes to "artifact_saved" events
   * to proactively embed new content.
   */
  subscribe(eventType: string, handler: (event: BusEvent) => void | Promise<void>): () => void {
    if (!this.eventBus) {
      console.warn(`[StatefulBackgroundActor:${this.role}] No event bus attached`);
      return () => {};
    }

    const unsubscribe = this.eventBus.subscribe(eventType, handler);
    this.subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Publish an event to the event bus (e.g., "embedding_complete").
   */
  async publish(eventType: string, payload: unknown): Promise<void> {
    if (!this.eventBus) return;
    await this.eventBus.publish(eventType, payload, `bg:${this.role}`);
  }

  // ---- Lifecycle ----

  /** Cleanup: unsubscribe from all events. */
  shutdown(): void {
    for (const unsub of this.subscriptions) {
      unsub();
    }
    this.subscriptions = [];
    this._initialized = false;
  }

  // ---- Persistence ----

  private async persistState(): Promise<void> {
    await this.stateStore.set(`bg-actor:${this.role}`, {
      lastActivityAt: this.state.lastActivityAt,
      totalProcessed: this.state.totalProcessed,
      totalFailed: this.state.totalFailed,
      metadata: this.state.metadata,
    });
  }
}

// ---- Registry ----

/**
 * Registry of all stateful background actors.
 * Provides a single point of access and lifecycle management.
 */
export class BackgroundActorRegistry {
  private actors = new Map<BackgroundAgentRole, StatefulBackgroundActor>();
  private stateStore: StateStore;
  private eventBus: EventBus;

  constructor(stateStore: StateStore, eventBus: EventBus) {
    this.stateStore = stateStore;
    this.eventBus = eventBus;
  }

  /** Register and initialize a background actor. */
  async register(role: BackgroundAgentRole): Promise<StatefulBackgroundActor> {
    if (this.actors.has(role)) {
      return this.actors.get(role)!;
    }

    const actor = new StatefulBackgroundActor(role, this.stateStore);
    actor.attachEventBus(this.eventBus);
    await actor.initialize();
    this.actors.set(role, actor);
    return actor;
  }

  /** Get a registered actor by role. */
  get(role: BackgroundAgentRole): StatefulBackgroundActor | undefined {
    return this.actors.get(role);
  }

  /** Get all registered actors. */
  getAll(): StatefulBackgroundActor[] {
    return Array.from(this.actors.values());
  }

  /** Get health status of all actors. */
  getHealthStatus(): Record<string, { healthy: boolean; state: BackgroundActorState }> {
    const status: Record<string, { healthy: boolean; state: BackgroundActorState }> = {};
    for (const [role, actor] of this.actors) {
      status[role] = {
        healthy: actor.isHealthy(),
        state: actor.getState(),
      };
    }
    return status;
  }

  /** Shutdown all actors. */
  shutdown(): void {
    for (const actor of this.actors.values()) {
      actor.shutdown();
    }
    this.actors.clear();
  }
}
