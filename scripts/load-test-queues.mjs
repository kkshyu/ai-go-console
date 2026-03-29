#!/usr/bin/env node
/**
 * Queue Load Test Script
 *
 * Enqueues configurable numbers of synthetic jobs to one or all BullMQ queues,
 * then polls stats until all jobs are completed. Reports throughput and latency.
 *
 * Usage:
 *   node scripts/load-test-queues.mjs                         # 50 jobs on all queues
 *   node scripts/load-test-queues.mjs --queue embedding --jobs 200
 *   node scripts/load-test-queues.mjs --jobs 100 --burst       # enqueue all at once
 *
 * Environment:
 *   REDIS_URL  — defaults to redis://localhost:6379
 */

import { Queue, QueueEvents } from "bullmq";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

function parseRedisUrl(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
  };
}

const connection = {
  ...parseRedisUrl(REDIS_URL),
  maxRetriesPerRequest: 1,
};

const ALL_QUEUES = [
  "embedding",
  "retrieval",
  "summarizer",
  "file-processing",
  "file-analysis",
  "import-orchestrator",
];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { queue: null, jobs: 50, burst: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--queue" && args[i + 1]) opts.queue = args[++i];
    if (args[i] === "--jobs" && args[i + 1]) opts.jobs = parseInt(args[++i], 10);
    if (args[i] === "--burst") opts.burst = true;
  }
  return opts;
}

async function getStats(queue) {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  return { waiting, active, completed, failed, delayed };
}

async function runLoadTest(queueName, jobCount, burst) {
  const queue = new Queue(queueName, { connection });
  queue.on("error", () => {});

  const statsBefore = await getStats(queue);
  const startTime = Date.now();
  console.log(`\n[${queueName}] Enqueuing ${jobCount} jobs${burst ? " (burst)" : ""}...`);

  const promises = [];
  for (let i = 0; i < jobCount; i++) {
    const payload = {
      type: "load_test",
      payload: { index: i, ts: Date.now() },
      requestId: `lt-${queueName}-${i}`,
    };
    const p = queue.add("load_test", payload, {
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 500 },
    });
    if (!burst) await p;
    else promises.push(p);
  }
  if (burst) await Promise.all(promises);

  const enqueueMs = Date.now() - startTime;
  console.log(`[${queueName}] Enqueued in ${enqueueMs}ms (${(jobCount / (enqueueMs / 1000)).toFixed(1)} jobs/s)`);

  console.log(`[${queueName}] Waiting for workers to drain...`);
  const pollStart = Date.now();
  const maxWaitMs = 300_000;
  let lastLog = 0;

  while (Date.now() - pollStart < maxWaitMs) {
    const stats = await getStats(queue);
    const newCompleted = stats.completed - statsBefore.completed;
    const newFailed = stats.failed - statsBefore.failed;
    const remaining = jobCount - newCompleted - newFailed;

    if (Date.now() - lastLog > 3000) {
      console.log(
        `  [${queueName}] waiting=${stats.waiting} active=${stats.active} completed=+${newCompleted} failed=+${newFailed} remaining=${remaining}`,
      );
      lastLog = Date.now();
    }

    if (remaining <= 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const totalMs = Date.now() - startTime;
  const statsAfter = await getStats(queue);
  const processed = (statsAfter.completed - statsBefore.completed) + (statsAfter.failed - statsBefore.failed);
  const throughput = processed / (totalMs / 1000);

  console.log(`\n[${queueName}] RESULTS:`);
  console.log(`  Jobs:       ${jobCount}`);
  console.log(`  Completed:  ${statsAfter.completed - statsBefore.completed}`);
  console.log(`  Failed:     ${statsAfter.failed - statsBefore.failed}`);
  console.log(`  Total time: ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`  Throughput: ${throughput.toFixed(1)} jobs/s`);

  await queue.close();
  return { queueName, jobCount, totalMs, throughput, processed };
}

async function main() {
  const opts = parseArgs();
  const queues = opts.queue ? [opts.queue] : ALL_QUEUES;

  console.log("=== Queue Load Test ===");
  console.log(`Redis:  ${REDIS_URL}`);
  console.log(`Queues: ${queues.join(", ")}`);
  console.log(`Jobs:   ${opts.jobs} per queue`);
  console.log(`Mode:   ${opts.burst ? "burst" : "sequential"}`);

  const results = [];
  for (const q of queues) {
    results.push(await runLoadTest(q, opts.jobs, opts.burst));
  }

  console.log("\n=== SUMMARY ===");
  console.log("Queue                   | Jobs | Time (s) | Throughput (j/s) | Processed");
  console.log("------------------------|------|----------|------------------|----------");
  for (const r of results) {
    console.log(
      `${r.queueName.padEnd(24)}| ${String(r.jobCount).padEnd(5)}| ${(r.totalMs / 1000).toFixed(1).padEnd(9)}| ${r.throughput.toFixed(1).padEnd(17)}| ${r.processed}`,
    );
  }

  console.log("\n=== RECOMMENDED TUNING ===");
  console.log("Based on results, consider:");
  console.log("- If throughput < jobs/s target: increase WORKER_CONCURRENCY or replicas");
  console.log("- If many failures: check worker logs, consider reducing concurrency");
  console.log("- Baseline recommendation: minReplicas=2, maxReplicas=10, concurrency=3-5");
  console.log("- For import-orchestrator (heavy I/O): concurrency=1, rely on pod scaling");
}

main().catch((err) => {
  console.error("Load test failed:", err);
  process.exit(1);
});
