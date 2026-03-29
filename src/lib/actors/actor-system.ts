/**
 * Actor System & Supervisor
 *
 * Manages actor lifecycle, message routing, heartbeat monitoring,
 * and one-for-one restart strategy. Runs in-memory within a single
 * HTTP request lifecycle.
 */

import { Actor } from "./actor";
import { HeartbeatMonitor } from "./heartbeat";
import type {
  ActorMessage,
  SupervisorStrategy,
  ErrorPayload,
  ActorErrorType,
} from "./types";
import { createMessage, DEFAULT_SUPERVISOR_STRATEGY } from "./types";
import type { AgentRole, OrchestrationState } from "../agents/types";
import { actorLog } from "./logger";

export type ActorFactory = (role: AgentRole, index: number) => Actor;

export class ActorSystem {
  private actors: Map<string, Actor> = new Map();
  private heartbeat: HeartbeatMonitor;
  private strategy: SupervisorStrategy;
  private sendEvent: (data: unknown) => Promise<void>;
  private actorFactory: ActorFactory | null = null;
  private _traceId: string | undefined;

  // Completion signaling
  private _completionResolve: (() => void) | null = null;
  private _completionPromise: Promise<void>;
  private _finalState: OrchestrationState | null = null;
  private _completed = false;

  /** Safety timeout for the entire orchestration (10 minutes — allows time for multiple agent rounds). */
  private static readonly SAFETY_TIMEOUT_MS = 10 * 60 * 1000;

  constructor(
    sendEvent: (data: unknown) => Promise<void>,
    strategy: SupervisorStrategy = DEFAULT_SUPERVISOR_STRATEGY,
    traceId?: string,
  ) {
    this.strategy = strategy;
    this.sendEvent = sendEvent;
    this._traceId = traceId;

    this.heartbeat = new HeartbeatMonitor(
      {
        intervalMs: strategy.heartbeatIntervalMs,
        timeoutMs: strategy.heartbeatTimeoutMs,
      },
      (actorId) => this.handleHeartbeatTimeout(actorId)
    );

    this._completionPromise = new Promise<void>((resolve) => {
      this._completionResolve = resolve;
    });
  }

  get traceId(): string | undefined {
    return this._traceId;
  }

  /** Set a factory function for creating actor instances (used by supervisor for restarts). */
  setActorFactory(factory: ActorFactory): void {
    this.actorFactory = factory;
  }

  // ---- Actor Lifecycle ----

  /** Spawn an actor and start its lifecycle. */
  async spawn(actor: Actor): Promise<void> {
    this.actors.set(actor.id, actor);

    // Propagate traceId
    if (this._traceId) {
      actor.setTraceId(this._traceId);
    }

    actor.setEventHandler((event, actorId, error) => {
      if (event === "died" && error) {
        this.handleActorDeath(actorId, error);
      }
    });

    // Give actor a reference to notify heartbeat monitor on activity
    actor.setHeartbeatNotifier(() => {
      this.heartbeat.recordPong(actor.id);
    });

    // Enable automatic response routing through the system
    actor.setSystemSend((msg) => this.send(msg));

    await actor.onStart();

    // Monitor all request-scoped actors (including PM) for heartbeat
    this.heartbeat.startMonitoring(actor.id);

    actorLog("info", actor.id, `Spawned (role=${actor.role})`, this._traceId);
  }

  /**
   * Spawn a child actor under a parent (for senior/junior hierarchy).
   * Sets parentActorId on the child's state for observability.
   */
  async spawnChild(parentId: string, actor: Actor): Promise<void> {
    await this.spawn(actor);
    // Set parent relationship on the actor state for observability
    const state = actor.getState();
    (state as { parentActorId?: string }).parentActorId = parentId;
  }

  /** Stop a specific actor. */
  stop(actorId: string): void {
    const actor = this.actors.get(actorId);
    if (!actor) return;

    actor.onStop();
    this.heartbeat.stopMonitoring(actorId);
    this.actors.delete(actorId);
    actorLog("info", actorId, "Stopped", this._traceId);
  }

  /** Stop all actors and cleanup. */
  stopAll(): void {
    // Stop heartbeat first to prevent restart attempts during cleanup
    this.heartbeat.stop();
    for (const actor of this.actors.values()) {
      actor.onStop();
    }
    this.actors.clear();
  }

  // ---- Message Routing ----

  /** Send a message to a specific actor by ID. */
  send(message: ActorMessage): void {
    const target = this.actors.get(message.to);
    if (!target) {
      actorLog("warn", "system", `No actor found with ID: ${message.to} (type=${message.type}, from=${message.from})`, this._traceId);

      // If the message was a meaningful dispatch and the target is gone,
      // route the failure back to PM (or parent) so it doesn't wait forever
      const dispatchTypes = ["task", "parallel_task", "sub_task", "discuss"];
      if (dispatchTypes.includes(message.type)) {
        // Infer agent role from actor ID (e.g. "architect-0" → "architect")
        const inferredRole = (message.to.split("-")[0] || "developer") as AgentRole;

        // For sub_task, try to route error to the parent (senior) actor first
        const errorTarget = message.type === "sub_task"
          ? (this.actors.get(message.from) || this.getActorsByRole("pm")[0])
          : this.getActorsByRole("pm")[0];

        if (errorTarget && errorTarget.id !== message.from) {
          const errorMsg = createMessage("error", message.to, errorTarget.id, {
            actorId: message.to,
            agentRole: inferredRole,
            error: `Target actor ${message.to} no longer exists — ${message.type} message dropped`,
            errorType: "unknown" as ActorErrorType,
            recoverable: false,
          } satisfies ErrorPayload);
          errorTarget.send(errorMsg);
        }
      }
      return;
    }

    // Propagate traceId
    if (this._traceId && !message.traceId) {
      (message as { traceId?: string }).traceId = this._traceId;
    }

    target.send(message);

    // Check for pending pong (heartbeat response)
    const pong = target.takePendingPong();
    if (pong) {
      this.heartbeat.recordPong(target.id);
      // Route pong to the sender if needed
      const sender = this.actors.get(pong.to);
      if (sender) {
        sender.send(pong);
      }
    }
  }

  /** Broadcast a message to all actors except the sender. */
  broadcast(message: ActorMessage): void {
    for (const [id, actor] of this.actors) {
      if (id !== message.from) {
        actor.send({ ...message, to: id });
      }
    }
  }

  // ---- Supervision ----

  /** Start heartbeat monitoring. */
  startHeartbeat(): void {
    this.heartbeat.start();
  }

  /** Stop heartbeat monitoring. */
  stopHeartbeat(): void {
    this.heartbeat.stop();
  }

  private handleHeartbeatTimeout(actorId: string): void {
    const actor = this.actors.get(actorId);
    if (!actor) return;

    actorLog("warn", actorId, "Heartbeat timeout", this._traceId);
    this.handleActorDeath(actorId, new Error("Heartbeat timeout"));
  }

  private async handleActorDeath(actorId: string, error: Error): Promise<void> {
    const actor = this.actors.get(actorId);
    if (!actor) return;

    const state = actor.getState();
    actorLog(
      "warn",
      actorId,
      `Actor died (role=${state.role}, restarts=${state.restartCount}/${state.maxRestarts}): ${error.message}`,
      this._traceId,
    );

    // Notify client about the restart
    await this.sendEvent({
      actorRestarted: {
        actorId,
        role: state.role,
        restartCount: state.restartCount + 1,
        maxRestarts: state.maxRestarts,
        error: error.message,
      },
    });

    // Check if we can restart
    if (state.restartCount >= this.strategy.maxRestarts) {
      actorLog("error", actorId, "Max restarts exceeded", this._traceId);
      this.stop(actorId);

      // If PM itself died permanently, signal completion immediately
      // (there's no PM to receive the error message)
      if (state.role === "pm") {
        actorLog("error", actorId, "PM actor permanently failed — signaling completion with error", this._traceId);
        await this.sendEvent({
          error: `PM 代理程式在 ${state.maxRestarts} 次重啟後仍然失敗: ${error.message}`,
        });
        this.signalCompletion({
          status: "error",
          tasks: [],
          parallelGroups: [],
          currentAgent: null,
          activeActors: [],
        });
        return;
      }

      // Classify the error for deterministic recovery
      const errorType = classifyError(error);

      // Notify PM about the permanent failure
      const pmActor = this.getActorsByRole("pm")[0];
      if (pmActor) {
        const errorMsg = createMessage("error", actorId, pmActor.id, {
          actorId,
          agentRole: state.role,
          error: `Actor ${actorId} permanently failed after ${state.maxRestarts} restarts: ${error.message}`,
          errorType,
          recoverable: false,
        } satisfies ErrorPayload);
        this.send(errorMsg);
      } else {
        // PM doesn't exist (possibly already stopped) — signal completion to prevent hang
        actorLog("error", actorId, "No PM actor available to handle error — signaling completion", this._traceId);
        await this.sendEvent({
          error: `代理程式 ${actorId} (${state.role}) 永久失敗且無法恢復: ${error.message}`,
        });
        this.signalCompletion({
          status: "error",
          tasks: [],
          parallelGroups: [],
          currentAgent: null,
          activeActors: [],
        });
      }
      return;
    }

    // Restart: stop old, create new with same role
    const lastTask = actor.getLastTaskMessage();
    const pendingMessages = actor.getMailboxSnapshot();
    this.stop(actorId);

    if (this.actorFactory) {
      const index = parseInt(actorId.split("-").pop() || "0", 10);
      let newActor;
      try {
        newActor = this.actorFactory(state.role, index);
      } catch (factoryErr) {
        actorLog("error", "system", `Cannot respawn actor ${actorId} (role=${state.role}): ${factoryErr instanceof Error ? factoryErr.message : String(factoryErr)}`, this.traceId);
        return;
      }
      newActor.incrementRestartCount();

      await this.spawn(newActor);
      await newActor.onRestart(error);

      // Re-send the last task message and any pending mailbox messages
      const messagesToReplay = [lastTask, ...pendingMessages].filter(
        (msg): msg is ActorMessage => msg !== null
      );
      for (const msg of messagesToReplay) {
        this.send({ ...msg, to: newActor.id });
      }
    }
  }

  // ---- Completion ----

  /** Signal that the orchestration is complete. */
  signalCompletion(finalState: OrchestrationState): void {
    if (this._completed) return; // Prevent double-signaling
    this._completed = true;
    this._finalState = finalState;
    this._completionResolve?.();
  }

  /**
   * Wait for the orchestration to complete.
   * Includes a safety timeout to prevent infinite hangs if signalCompletion() is never called.
   */
  async waitForCompletion(): Promise<void> {
    const safetyTimeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        if (!this._completed) {
          actorLog("error", "system", "Safety timeout reached — forcing completion to prevent infinite hang", this._traceId);
          this.sendEvent({ error: "系統安全逾時：流程未正常結束，已強制中斷。" }).catch(() => {});
          this.signalCompletion({
            status: "error",
            tasks: [],
            parallelGroups: [],
            currentAgent: null,
            activeActors: [],
          });
        }
        resolve();
      }, ActorSystem.SAFETY_TIMEOUT_MS);
    });

    return Promise.race([this._completionPromise, safetyTimeout]);
  }

  /** Get the final orchestration state after completion. */
  getFinalState(): OrchestrationState | null {
    return this._finalState;
  }

  // ---- Query ----

  getActor(id: string): Actor | undefined {
    return this.actors.get(id);
  }

  getActorsByRole(role: AgentRole): Actor[] {
    return Array.from(this.actors.values()).filter((a) => a.role === role);
  }

  getAllActorIds(): string[] {
    return Array.from(this.actors.keys());
  }

  getAllStates() {
    return Array.from(this.actors.values()).map((a) => a.getState());
  }
}

// ---- Error Classification ----

/** Classify an error for deterministic recovery decisions. */
function classifyError(error: Error): ActorErrorType {
  const msg = error.message.toLowerCase();

  if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("aborted")) {
    return "api_timeout";
  }
  if (msg.includes("rate limit") || msg.includes("429") || msg.includes("too many requests")) {
    return "rate_limit";
  }
  if (msg.includes("invalid") || msg.includes("parse") || msg.includes("json")) {
    return "invalid_response";
  }
  return "unknown";
}
