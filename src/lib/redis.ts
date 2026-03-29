/**
 * Shared Redis Client (ioredis)
 *
 * Lazy singleton for direct Redis operations (ZSET, locks, etc.).
 * BullMQ manages its own connections internally; this client is
 * for non-BullMQ use cases like the activity feed.
 */

import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const globalKey = Symbol.for("SharedRedisClient");

export function getRedis(): Redis {
  const g = globalThis as unknown as Record<symbol, Redis>;
  if (!g[globalKey]) {
    g[globalKey] = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times > 5 ? null : Math.min(times * 500, 3000)),
    });
    g[globalKey].on("error", () => {
      /* suppress connection errors — callers handle gracefully */
    });
  }
  return g[globalKey];
}

export async function isRedisAvailable(): Promise<boolean> {
  try {
    const redis = getRedis();
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
