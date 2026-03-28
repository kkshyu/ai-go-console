/**
 * EventBus — In-Memory Pub/Sub for Actor System
 *
 * Provides loose coupling between agents via publish/subscribe pattern.
 * Agents publish completion events; the DAGExecutor and ProgressTracker
 * subscribe to coordinate phase transitions and track progress.
 *
 * All events are scoped to a single HTTP request lifecycle.
 */

export interface BusEvent {
  type: string;
  payload: unknown;
  source: string;       // actor ID or "system"
  timestamp: number;
}

export type EventHandler = (event: BusEvent) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private wildcardHandlers = new Set<EventHandler>();
  private eventLog: BusEvent[] = [];

  /** Subscribe to a specific event type. Returns an unsubscribe function. */
  subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /** Subscribe to all events. Returns an unsubscribe function. */
  subscribeAll(handler: EventHandler): () => void {
    this.wildcardHandlers.add(handler);
    return () => {
      this.wildcardHandlers.delete(handler);
    };
  }

  /** Publish an event to all subscribers. */
  async publish(type: string, payload: unknown, source: string): Promise<void> {
    const event: BusEvent = {
      type,
      payload,
      source,
      timestamp: Date.now(),
    };

    this.eventLog.push(event);

    // Collect all handlers that need to be called
    const handlers: EventHandler[] = [];

    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      handlers.push(...typeHandlers);
    }
    handlers.push(...this.wildcardHandlers);

    // Execute all handlers (fire-and-forget for async handlers)
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (err) {
          console.warn(`[EventBus] Handler error for "${type}":`, err);
        }
      }),
    );
  }

  /** Get the event log for debugging. */
  getEventLog(): ReadonlyArray<BusEvent> {
    return this.eventLog;
  }

  /** Clear all subscriptions and event log. */
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
    this.eventLog = [];
  }
}
