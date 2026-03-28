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

// ── Producer Functions ───────────────────────────────────────────────────────

/**
 * Enqueue a task for background processing.
 * Returns the job ID.
 */
export async function enqueueTask(
  queueName: QueueName,
  payload: QueueJobPayload,
): Promise<string> {
  const queue = getQueue(queueName);
  const job = await queue.add(payload.type, payload, {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
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

  const job = await queue.add(payload.type, payload, {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });

  // Wait for the job to complete
  const result = await job.waitUntilFinished(events, timeoutMs);
  return result as T;
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
  const worker = new Worker(
    queueName,
    async (job: Job<QueueJobPayload>) => {
      return processor(job);
    },
    {
      connection: redisConnection,
      concurrency: options?.concurrency || 3,
    },
  );

  worker.on("failed", (job, error) => {
    console.error(`[Queue:${queueName}] Job ${job?.id} failed:`, error.message);
  });

  worker.on("completed", (job) => {
    console.log(`[Queue:${queueName}] Job ${job.id} completed`);
  });

  return worker;
}

// ── Queue Stats ──────────────────────────────────────────────────────────────

/**
 * Get statistics for a queue.
 */
export async function getQueueStats(queueName: QueueName): Promise<QueueStats> {
  const queue = getQueue(queueName);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Get statistics for all queues.
 */
export async function getAllQueueStats(): Promise<Record<QueueName, QueueStats>> {
  const names: QueueName[] = ["embedding", "retrieval", "summarizer", "file-processing", "file-analysis"];
  const results = {} as Record<QueueName, QueueStats>;

  for (const name of names) {
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
