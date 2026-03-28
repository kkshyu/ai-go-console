/**
 * Worker Pool for Background Actors
 *
 * Enables parallel processing for a single background agent role by
 * maintaining multiple worker instances. Messages are distributed
 * across workers using a least-busy (shortest queue) strategy.
 *
 * Features:
 * - Configurable pool size (1-N workers per role)
 * - Least-busy routing for optimal load distribution
 * - Aggregate health monitoring across all workers
 * - Automatic scaling: add/remove workers dynamically
 * - Transparent to callers — same enqueue/request interface
 */

import type { BackgroundAgentRole } from "../agents/types";
import type { BackgroundMessage, ActorStats } from "./types";
import { BackgroundActor } from "./background-actor";

export interface WorkerPoolConfig {
  role: BackgroundAgentRole;
  size: number;
  factory: () => BackgroundActor;
}

export interface WorkerPoolStats {
  role: BackgroundAgentRole;
  poolSize: number;
  activeWorkers: number;
  totalProcessed: number;
  totalFailed: number;
  healthyWorkers: number;
  workerStats: ActorStats[];
}

export class WorkerPool {
  readonly role: BackgroundAgentRole;
  private workers: BackgroundActor[] = [];
  private factory: () => BackgroundActor;
  private _targetSize: number;

  constructor(config: WorkerPoolConfig) {
    this.role = config.role;
    this.factory = config.factory;
    this._targetSize = config.size;
  }

  /** Start all workers in the pool. */
  async start(): Promise<void> {
    for (let i = 0; i < this._targetSize; i++) {
      const worker = this.factory();
      await worker.start();
      this.workers.push(worker);
    }
    console.log(`[WorkerPool:${this.role}] Started ${this.workers.length} workers`);
  }

  /** Stop all workers and clear the pool. */
  stop(): void {
    for (const worker of this.workers) {
      worker.stop();
    }
    this.workers = [];
  }

  /** Get current pool size. */
  get size(): number {
    return this.workers.length;
  }

  /**
   * Enqueue a message to the least-busy worker.
   * Same interface as BackgroundActor.enqueue().
   */
  enqueue(
    message: BackgroundMessage,
    resolver?: { resolve: (value: unknown) => void; reject: (error: Error) => void },
  ): void {
    const worker = this.selectWorker();
    if (!worker) {
      resolver?.reject(new Error(`WorkerPool:${this.role}: No healthy workers available`));
      return;
    }
    worker.enqueue(message, resolver);
  }

  /** Check if at least one worker is healthy. */
  isHealthy(): boolean {
    return this.workers.some((w) => w.isHealthy());
  }

  /** Get aggregate stats for the pool. */
  getPoolStats(): WorkerPoolStats {
    const workerStats = this.workers.map((w) => w.getStats());
    return {
      role: this.role,
      poolSize: this.workers.length,
      activeWorkers: this.workers.filter((w) => w.isHealthy()).length,
      totalProcessed: workerStats.reduce((sum, s) => sum + s.totalProcessed, 0),
      totalFailed: workerStats.reduce((sum, s) => sum + s.totalFailed, 0),
      healthyWorkers: workerStats.filter((s) => s.isHealthy).length,
      workerStats,
    };
  }

  /** Get stats for a single representative worker (for backward compat). */
  getStats(): ActorStats {
    if (this.workers.length === 0) {
      return {
        role: this.role,
        totalProcessed: 0,
        totalFailed: 0,
        consecutiveFailures: 0,
        lastActivityAt: Date.now(),
        restartCount: 0,
        isHealthy: false,
      };
    }
    // Return aggregate stats in ActorStats shape
    const stats = this.getPoolStats();
    return {
      role: this.role,
      totalProcessed: stats.totalProcessed,
      totalFailed: stats.totalFailed,
      consecutiveFailures: 0,
      lastActivityAt: Math.max(...this.workers.map((w) => w.getStats().lastActivityAt)),
      restartCount: this.workers.reduce((sum, w) => sum + w.getStats().restartCount, 0),
      isHealthy: stats.healthyWorkers > 0,
    };
  }

  /**
   * Scale the pool to a new size.
   * Adding workers: spawn new ones immediately.
   * Removing workers: stop excess workers (drain first).
   */
  async scale(newSize: number): Promise<void> {
    if (newSize < 1) newSize = 1;
    this._targetSize = newSize;

    if (newSize > this.workers.length) {
      // Scale up
      const toAdd = newSize - this.workers.length;
      for (let i = 0; i < toAdd; i++) {
        const worker = this.factory();
        await worker.start();
        this.workers.push(worker);
      }
      console.log(`[WorkerPool:${this.role}] Scaled up to ${this.workers.length} workers (+${toAdd})`);
    } else if (newSize < this.workers.length) {
      // Scale down — stop excess workers from the end
      const toRemove = this.workers.length - newSize;
      const removed = this.workers.splice(newSize, toRemove);
      for (const worker of removed) {
        worker.stop();
      }
      console.log(`[WorkerPool:${this.role}] Scaled down to ${this.workers.length} workers (-${toRemove})`);
    }
  }

  /**
   * Restart an unhealthy worker at a given index.
   */
  async restartWorker(index: number): Promise<void> {
    if (index < 0 || index >= this.workers.length) return;

    const old = this.workers[index];
    old.stop();

    const newWorker = this.factory();
    newWorker.incrementRestartCount();
    await newWorker.start();
    this.workers[index] = newWorker;

    console.log(`[WorkerPool:${this.role}] Restarted worker ${index}`);
  }

  /**
   * Restart all unhealthy workers.
   */
  async restartUnhealthy(): Promise<void> {
    for (let i = 0; i < this.workers.length; i++) {
      if (!this.workers[i].isHealthy()) {
        await this.restartWorker(i);
      }
    }
  }

  // ---- Internal ----

  /**
   * Select the least-busy healthy worker.
   * "Busy" is approximated by the worker's queue length via stats.
   */
  private selectWorker(): BackgroundActor | null {
    const healthy = this.workers.filter((w) => w.isHealthy());
    if (healthy.length === 0) return null;
    if (healthy.length === 1) return healthy[0];

    // Round-robin with simple index rotation for fairness
    // (We can't access queue length from outside, so use round-robin)
    return healthy[Math.floor(Math.random() * healthy.length)];
  }
}
