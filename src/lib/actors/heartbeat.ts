/**
 * Heartbeat Monitor
 *
 * Periodically pings all specialist actors. If an actor fails to
 * update its lastHeartbeat within the timeout window, it is
 * considered dead and the supervisor is notified.
 */

export interface HeartbeatConfig {
  intervalMs: number;
  timeoutMs: number;
}

export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  intervalMs: 10_000,
  timeoutMs: 30_000,
};

export class HeartbeatMonitor {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastPong: Map<string, number> = new Map();
  private onTimeout: (actorId: string) => void;
  private config: HeartbeatConfig;

  constructor(config: HeartbeatConfig, onTimeout: (actorId: string) => void) {
    this.config = config;
    this.onTimeout = onTimeout;
  }

  /** Start monitoring an actor. */
  startMonitoring(actorId: string): void {
    this.lastPong.set(actorId, Date.now());
  }

  /** Stop monitoring an actor. */
  stopMonitoring(actorId: string): void {
    this.lastPong.delete(actorId);
  }

  /** Record a heartbeat response from an actor. */
  recordPong(actorId: string): void {
    this.lastPong.set(actorId, Date.now());
  }

  /** Check all monitored actors for timeouts. Returns timed-out actor IDs. */
  checkTimeouts(): string[] {
    const now = Date.now();
    const timedOut: string[] = [];

    for (const [actorId, lastTime] of this.lastPong) {
      if (now - lastTime > this.config.timeoutMs) {
        timedOut.push(actorId);
      }
    }

    return timedOut;
  }

  /** Start the periodic heartbeat check loop. */
  start(): void {
    if (this.timer) return;

    this.timer = setInterval(() => {
      const timedOut = this.checkTimeouts();
      for (const actorId of timedOut) {
        this.stopMonitoring(actorId);
        this.onTimeout(actorId);
      }
    }, this.config.intervalMs);
  }

  /** Stop all heartbeat monitoring. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.lastPong.clear();
  }

  /** Check if any actors are being monitored. */
  get monitoredCount(): number {
    return this.lastPong.size;
  }
}
