/**
 * Actor Base Class
 *
 * Each actor has a mailbox (async message queue), lifecycle hooks,
 * and automatic heartbeat response. Exceptions in onReceive are
 * caught and treated as actor death for the supervisor to handle.
 */

import type { AgentRole } from "../agents/types";
import type { ActorMessage, ActorState, ActorStatus } from "./types";
import { createMessage } from "./types";
import { actorLog } from "./logger";

export type ActorEventHandler = (event: "died" | "completed", actorId: string, error?: Error) => void;

export abstract class Actor {
  readonly id: string;
  readonly role: AgentRole;

  private mailbox: ActorMessage[] = [];
  private processing = false;
  private _state: ActorState;
  private _eventHandler: ActorEventHandler | null = null;
  private _lastTaskMessage: ActorMessage | null = null;
  private _heartbeatNotifier: (() => void) | null = null;
  private _systemSend: ((msg: ActorMessage) => void) | null = null;
  private _traceId: string | undefined;

  constructor(id: string, role: AgentRole, maxRestarts = 2) {
    this.id = id;
    this.role = role;
    this._state = {
      id,
      role,
      status: "idle",
      lastHeartbeat: Date.now(),
      restartCount: 0,
      maxRestarts,
    };
  }

  // ---- Lifecycle hooks (implemented by subclasses) ----

  abstract onStart(): Promise<void>;
  abstract onReceive(message: ActorMessage): Promise<ActorMessage | null>;
  abstract onStop(): void;
  abstract onRestart(error: Error): Promise<void>;

  // ---- Trace ID ----

  get traceId(): string | undefined {
    return this._traceId;
  }

  setTraceId(traceId: string): void {
    this._traceId = traceId;
  }

  // ---- Mailbox ----

  /** Enqueue a message and trigger processing if idle. */
  send(message: ActorMessage): void {
    // Capture traceId from first incoming message
    if (message.traceId && !this._traceId) {
      this._traceId = message.traceId;
    }

    // Auto-respond to heartbeat pings
    if (message.type === "heartbeat_ping") {
      this.updateHeartbeat();
      const pong = createMessage("heartbeat_pong", this.id, message.from, {
        status: this._state.status,
      });
      this._eventHandler?.("completed", this.id);
      // Route pong back through the system — caller handles delivery
      this._pendingPong = pong;
      return;
    }

    this.mailbox.push(message);
    if (!this.processing) {
      this.processMailbox();
    }
  }

  private _pendingPong: ActorMessage | null = null;

  /** Consume pending heartbeat pong (called by ActorSystem). */
  takePendingPong(): ActorMessage | null {
    const pong = this._pendingPong;
    this._pendingPong = null;
    return pong;
  }

  private async processMailbox(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.mailbox.length > 0) {
      const message = this.mailbox.shift()!;
      this._lastTaskMessage = message;
      this.updateStatus("processing");

      const startTime = Date.now();
      try {
        const response = await this.onReceive(message);
        const durationMs = Date.now() - startTime;
        actorLog("info", this.id, `Processed ${message.type}`, this._traceId, { durationMs });

        if (response) {
          // Propagate traceId to response
          if (this._traceId && !response.traceId) {
            (response as { traceId?: string }).traceId = this._traceId;
          }
          if (this._systemSend) {
            // Route response through the ActorSystem automatically
            this._systemSend(response);
          } else {
            // Fallback: store for polling (legacy)
            this._pendingResponse = response;
          }
        }
        this.updateStatus("idle");
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const durationMs = Date.now() - startTime;
        actorLog("error", this.id, `Failed processing ${message.type}: ${error.message}`, this._traceId, { durationMs });
        this.updateStatus("dead");
        this._eventHandler?.("died", this.id, error);
        this.processing = false;
        return; // Stop processing — supervisor will handle restart
      }
    }

    this.processing = false;
  }

  private _pendingResponse: ActorMessage | null = null;

  /** Consume pending response (called by ActorSystem after processing). */
  takePendingResponse(): ActorMessage | null {
    const resp = this._pendingResponse;
    this._pendingResponse = null;
    return resp;
  }

  // ---- State ----

  getState(): Readonly<ActorState> {
    return { ...this._state };
  }

  updateStatus(status: ActorStatus): void {
    this._state = { ...this._state, status };
  }

  updateHeartbeat(): void {
    this._state = { ...this._state, lastHeartbeat: Date.now() };
    // Notify the heartbeat monitor so it doesn't time out this actor
    this._heartbeatNotifier?.();
  }

  /** Set a callback that notifies the heartbeat monitor on activity. */
  setHeartbeatNotifier(notifier: () => void): void {
    this._heartbeatNotifier = notifier;
  }

  /** Set a callback for routing responses through the ActorSystem. */
  setSystemSend(fn: (msg: ActorMessage) => void): void {
    this._systemSend = fn;
  }

  incrementRestartCount(): void {
    this._state = {
      ...this._state,
      restartCount: this._state.restartCount + 1,
    };
  }

  getLastTaskMessage(): ActorMessage | null {
    return this._lastTaskMessage;
  }

  /** Get a snapshot of pending messages in the mailbox (for restart resilience). */
  getMailboxSnapshot(): ActorMessage[] {
    return [...this.mailbox];
  }

  // ---- Event handler ----

  setEventHandler(handler: ActorEventHandler): void {
    this._eventHandler = handler;
  }

  protected emitEvent(event: "died" | "completed", error?: Error): void {
    this._eventHandler?.(event, this.id, error);
  }
}
