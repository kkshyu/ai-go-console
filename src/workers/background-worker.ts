/**
 * Background Worker Entry Point
 *
 * Standalone Node.js process that runs in k8s worker pods.
 * Consumes tasks from Redis queues and processes them using
 * the existing actor implementations.
 *
 * Usage: node src/workers/background-worker.js
 * (compile with tsc or tsx first)
 */

import { createWorker, closeAllQueues } from "../lib/queue";
import type { Job } from "bullmq";
import type { QueueJobPayload } from "../lib/queue/types";
import type { BackgroundMessage, BackgroundMessageType } from "../lib/actors/types";

// Lazy-import actors to avoid loading unnecessary dependencies
async function createActors() {
  const { EmbeddingActor } = await import("../lib/actors/embedding-actor");
  const { RetrievalActor } = await import("../lib/actors/retrieval-actor");
  const { SummarizerActor } = await import("../lib/actors/summarizer-actor");

  return {
    embedding: new EmbeddingActor(`k8s-embedding-${process.pid}`),
    retrieval: new RetrievalActor(`k8s-retrieval-${process.pid}`),
    summarizer: new SummarizerActor(`k8s-summarizer-${process.pid}`),
  };
}

async function main() {
  console.log("[BackgroundWorker] Starting...");

  const actors = await createActors();

  // Start all actors
  for (const [role, actor] of Object.entries(actors)) {
    await actor.start();
    console.log(`[BackgroundWorker] Actor "${role}" started`);
  }

  // Create workers for each queue
  const workers = [
    createWorker("embedding", async (job: Job<QueueJobPayload>) => {
      const msg = jobToMessage(job);
      return actors.embedding.process(msg);
    }),

    createWorker("retrieval", async (job: Job<QueueJobPayload>) => {
      const msg = jobToMessage(job);
      return actors.retrieval.process(msg);
    }),

    createWorker("summarizer", async (job: Job<QueueJobPayload>) => {
      const msg = jobToMessage(job);
      return actors.summarizer.process(msg);
    }),
  ];

  // Optionally register file processing workers
  try {
    const { FileProcessorActor } = await import("../lib/actors/file-processor-actor");
    const { FileAnalyzerActor } = await import("../lib/actors/file-analyzer-actor");

    const fileProcessor = new FileProcessorActor(`k8s-file-processor-${process.pid}`);
    const fileAnalyzer = new FileAnalyzerActor(`k8s-file-analyzer-${process.pid}`);

    await fileProcessor.start();
    await fileAnalyzer.start();

    workers.push(
      createWorker("file-processing", async (job: Job<QueueJobPayload>) => {
        const msg = jobToMessage(job);
        return fileProcessor.process(msg);
      }),
      createWorker("file-analysis", async (job: Job<QueueJobPayload>) => {
        const msg = jobToMessage(job);
        return fileAnalyzer.process(msg);
      }),
    );

    console.log("[BackgroundWorker] File processing workers registered");
  } catch (err) {
    console.warn("[BackgroundWorker] File processing actors not available:", err);
  }

  console.log(`[BackgroundWorker] ${workers.length} queue workers running. Waiting for jobs...`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[BackgroundWorker] Shutting down...");
    for (const worker of workers) {
      await worker.close();
    }
    await closeAllQueues();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

/**
 * Convert a BullMQ Job to the BackgroundMessage format expected by actors.
 */
function jobToMessage(job: Job<QueueJobPayload>): BackgroundMessage {
  return {
    id: `bg-msg-${job.id}`,
    type: job.data.type as BackgroundMessageType,
    requestId: job.data.requestId || `req-${job.id}`,
    payload: job.data.payload,
    timestamp: job.timestamp || Date.now(),
  };
}

main().catch((err) => {
  console.error("[BackgroundWorker] Fatal error:", err);
  process.exit(1);
});
