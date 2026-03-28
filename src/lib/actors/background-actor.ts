/**
 * Background Actor Base Class
 *
 * Unlike request-scoped Actor, BackgroundActor:
 * - Persists across HTTP requests (server-lifetime)
 * - Has its own async message queue with concurrent processing
 * - Self-monitors health via consecutive failure tracking
 * - Gracefully handles errors without dying
 */

import type { BackgroundAgentRole } from "../agents/types";
import type { BackgroundMessage, ActorStats } from "./types";

const MAX_CONSECUTIVE_FAILURES = 5;

let _bgMsgCounter = 0;

export function createBackgroundMessage(
  type: BackgroundMessage["type"],
  payload: unknown,
  requestId?: string,
): BackgroundMessage {
  return {
    id: `bg-msg-${Date.now()}-${++_bgMsgCounter}`,
    type,
    requestId: requestId || `req-${Date.now()}-${_bgMsgCounter}`,
    payload,
    timestamp: Date.now(),
  };
}

export abstract class BackgroundActor {
  readonly id: string;
  readonly role: BackgroundAgentRole;

  private queue: BackgroundMessage[] = [];
  private processing = false;
  private alive = true;
  private _consecutiveFailures = 0;
  private _totalProcessed = 0;
  private _totalFailed = 0;
  private _lastActivityAt = Date.now();
  private _restartCount = 0;

  // Pending request-response resolvers
  private pendingRequests = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();

  constructor(id: string, role: BackgroundAgentRole) {
    this.id = id;
    this.role = role;
  }

  /**
   * Process a single message. Implemented by subclasses.
   * Should return the result payload for request-response patterns.
   */
  abstract process(message: BackgroundMessage): Promise<unknown>;

  /**
   * Enqueue a message for processing.
   * Optionally provide resolve/reject for request-response pattern.
   */
  enqueue(
    message: BackgroundMessage,
    resolver?: { resolve: (value: unknown) => void; reject: (error: Error) => void },
  ): void {
    if (!this.alive) {
      resolver?.reject(new Error(`BackgroundActor ${this.id} is not alive`));
      return;
    }

    if (resolver) {
      this.pendingRequests.set(message.requestId, resolver);
    }

    this.queue.push(message);
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Start the processing loop. Called by BackgroundActorSystem.
   */
  async start(): Promise<void> {
    this.alive = true;
    this._lastActivityAt = Date.now();
  }

  /**
   * Stop the actor and reject all pending requests.
   */
  stop(): void {
    this.alive = false;
    this.queue = [];

    // Reject all pending requests
    for (const [requestId, resolver] of this.pendingRequests) {
      resolver.reject(new Error(`BackgroundActor ${this.id} stopped`));
      this.pendingRequests.delete(requestId);
    }
  }

  // ---- Health ----

  isHealthy(): boolean {
    return this.alive && this._consecutiveFailures < MAX_CONSECUTIVE_FAILURES;
  }

  getStats(): ActorStats {
    return {
      role: this.role,
      totalProcessed: this._totalProcessed,
      totalFailed: this._totalFailed,
      consecutiveFailures: this._consecutiveFailures,
      lastActivityAt: this._lastActivityAt,
      restartCount: this._restartCount,
      isHealthy: this.isHealthy(),
    };
  }

  incrementRestartCount(): void {
    this._restartCount++;
  }

  // ---- Internal ----

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.alive) {
      const message = this.queue.shift()!;
      this._lastActivityAt = Date.now();

      try {
        const result = await this.process(message);
        this._totalProcessed++;
        this._consecutiveFailures = 0;

        // Resolve pending request if exists
        const resolver = this.pendingRequests.get(message.requestId);
        if (resolver) {
          resolver.resolve(result);
          this.pendingRequests.delete(message.requestId);
        }
      } catch (err) {
        this._totalFailed++;
        this._consecutiveFailures++;
        const error = err instanceof Error ? err : new Error(String(err));

        console.warn(
          `[BackgroundActor:${this.role}] Process failed (${this._consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): ${error.message}`,
        );

        // Reject pending request if exists
        const resolver = this.pendingRequests.get(message.requestId);
        if (resolver) {
          resolver.reject(error);
          this.pendingRequests.delete(message.requestId);
        }

        // Mark as unhealthy if too many consecutive failures
        if (this._consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.error(
            `[BackgroundActor:${this.role}] Max consecutive failures reached, marking unhealthy`,
          );
        }
      }
    }

    this.processing = false;
  }
}
