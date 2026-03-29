/**
 * Message Queue Module (BullMQ)
 *
 * Provides producer and consumer functions for background actor
 * communication via Redis-backed queues.
 *
 * Producer side: Next.js server enqueues tasks
 * Consumer side: k8s Worker pods process tasks
 */

import { Queue, Worker, Job, QueueEvents } from "bullmq";
import type { QueueName, QueueJobPayload, QueueStats } from "./types";
import { ALL_QUEUE_NAMES } from "./types";

// ── Redis Connection ─────────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
  };
}

const redisConnection = {
  ...parseRedisUrl(REDIS_URL),
  maxRetriesPerRequest: 1,
  retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 500, 3000)),
};

// ── Queue Instances (singleton per queue name) ───────────────────────────────

const queues = new Map<QueueName, Queue>();
const queueEvents = new Map<QueueName, QueueEvents>();

function getQueue(name: QueueName): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: redisConnection });
    queue.on("error", () => { /* suppress Redis connection errors */ });
    queues.set(name, queue);
  }
  return queue;
}

function getQueueEvents(name: QueueName): QueueEvents {
  let events = queueEvents.get(name);
  if (!events) {
    events = new QueueEvents(name, { connection: redisConnection });
    events.on("error", () => { /* suppress Redis connection errors */ });
    queueEvents.set(name, events);
  }
  return events;
}

// ── Default Job Options ──────────────────────────────────────────────────────

const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 2_000,
  },
};

// ── Producer Functions ───────────────────────────────────────────────────────

/**
 * Enqueue a task for background processing.
 * Returns the job ID.
 *
 * Features:
 * - Automatic retry with exponential backoff (3 attempts, 2s base delay)
 * - Idempotency: if `payload.idempotencyKey` is set, duplicate enqueues are deduplicated
 */
export async function enqueueTask(
  queueName: QueueName,
  payload: QueueJobPayload,
): Promise<string> {
  const queue = getQueue(queueName);
  const jobId = payload.idempotencyKey || undefined;
  const job = await queue.add(payload.type, payload, {
    ...DEFAULT_JOB_OPTIONS,
    ...(jobId ? { jobId } : {}),
  });
  return job.id || "unknown";
}

/**
 * Enqueue a task and wait for the result.
 * Used for request-response patterns (e.g., retrieval, summarizer).
 */
export async function enqueueAndWait<T = unknown>(
  queueName: QueueName,
  payload: QueueJobPayload,
  timeoutMs: number = 30_000,
): Promise<T> {
  const queue = getQueue(queueName);
  const events = getQueueEvents(queueName);
  const jobId = payload.idempotencyKey || undefined;

  const job = await queue.add(payload.type, payload, {
    ...DEFAULT_JOB_OPTIONS,
    ...(jobId ? { jobId } : {}),
  });

  const result = await job.waitUntilFinished(events, timeoutMs);
  return result as T;
}

// ── Concurrency Configuration ────────────────────────────────────────────────

const DEFAULT_CONCURRENCY = 3;

/**
 * Resolve concurrency for a queue.
 * Priority: explicit option > per-queue env > global env > default (3).
 *
 * Environment variables:
 *   WORKER_CONCURRENCY           — global default for all queues
 *   WORKER_CONCURRENCY_<QUEUE>   — per-queue override (queue name uppercased, hyphens → underscores)
 *     e.g. WORKER_CONCURRENCY_IMPORT_ORCHESTRATOR=1
 */
function resolveConcurrency(queueName: QueueName, explicit?: number): number {
  if (explicit !== undefined) return explicit;

  const envKey = `WORKER_CONCURRENCY_${queueName.toUpperCase().replace(/-/g, "_")}`;
  const perQueue = process.env[envKey];
  if (perQueue) return parseInt(perQueue, 10) || DEFAULT_CONCURRENCY;

  const global = process.env.WORKER_CONCURRENCY;
  if (global) return parseInt(global, 10) || DEFAULT_CONCURRENCY;

  return DEFAULT_CONCURRENCY;
}

// ── Consumer Functions ───────────────────────────────────────────────────────

/**
 * Create a BullMQ Worker that processes jobs from a queue.
 * Used by the k8s worker pods.
 */
export function createWorker(
  queueName: QueueName,
  processor: (job: Job<QueueJobPayload>) => Promise<unknown>,
  options?: {
    concurrency?: number;
  },
): Worker {
  const concurrency = resolveConcurrency(queueName, options?.concurrency);

  const worker = new Worker(
    queueName,
    async (job: Job<QueueJobPayload>) => {
      return processor(job);
    },
    {
      connection: redisConnection,
      concurrency,
    },
  );

  console.log(`[Queue:${queueName}] Worker started (concurrency=${concurrency})`);

  worker.on("failed", (job, error) => {
    const attemptInfo = job ? ` (attempt ${job.attemptsMade}/${job.opts?.attempts ?? "?"})` : "";
    console.error(`[Queue:${queueName}] Job ${job?.id} failed${attemptInfo}:`, error.message);
  });

  worker.on("completed", (job) => {
    const duration = job.finishedOn && job.processedOn ? `${job.finishedOn - job.processedOn}ms` : "?";
    console.log(`[Queue:${queueName}] Job ${job.id} completed (${duration})`);
  });

  return worker;
}

// ── Queue Stats ──────────────────────────────────────────────────────────────

const LATENCY_SAMPLE_SIZE = 20;

/**
 * Get statistics for a queue, including processing latency and backpressure indicators.
 */
export async function getQueueStats(queueName: QueueName): Promise<QueueStats> {
  const queue = getQueue(queueName);
  const [waiting, active, completed, failed, delayed, recentCompleted, waitingJobs] =
    await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.getCompleted(0, LATENCY_SAMPLE_SIZE - 1),
      queue.getWaiting(0, 0),
    ]);

  let avgProcessingTimeMs: number | undefined;
  if (recentCompleted.length > 0) {
    const durations = recentCompleted
      .map((j) => (j.finishedOn && j.processedOn ? j.finishedOn - j.processedOn : null))
      .filter((d): d is number => d !== null && d >= 0);
    if (durations.length > 0) {
      avgProcessingTimeMs = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }
  }

  let oldestWaitingAgeMs: number | undefined;
  if (waitingJobs.length > 0 && waitingJobs[0].timestamp) {
    oldestWaitingAgeMs = Date.now() - waitingJobs[0].timestamp;
  }

  return { waiting, active, completed, failed, delayed, avgProcessingTimeMs, oldestWaitingAgeMs };
}

/**
 * Get statistics for all queues.
 */
export async function getAllQueueStats(): Promise<Record<QueueName, QueueStats>> {
  const results = {} as Record<QueueName, QueueStats>;

  for (const name of ALL_QUEUE_NAMES) {
    try {
      results[name] = await getQueueStats(name);
    } catch {
      results[name] = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
  }

  return results;
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

/**
 * Close all queue connections.
 * Call on process shutdown.
 */
export async function closeAllQueues(): Promise<void> {
  for (const queue of queues.values()) {
    await queue.close();
  }
  for (const events of queueEvents.values()) {
    await events.close();
  }
  queues.clear();
  queueEvents.clear();
}
