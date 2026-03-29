/**
 * Context Service
 *
 * Provides a TTL-cached RAG retrieval layer for specialist actors.
 * When multiple actors query similar context within the TTL window,
 * subsequent calls get a cache hit instead of redundant vector searches.
 *
 * Pass a shared instance through SpecialistConfig so all actors in a
 * request share the same cache.
 */

import type { BackgroundActorSystem } from "./background-system";
import { actorLog } from "./logger";

interface CacheEntry {
  context: string;
  timestamp: number;
}

/** Default TTL for cached retrieval results (30 seconds) */
const DEFAULT_TTL_MS = 30_000;

export class ContextService {
  private cache = new Map<string, CacheEntry>();
  private ttlMs: number;

  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /**
   * Retrieve context via RAG, using cache if available.
   * Cache key is `conversationId:hash(query)`.
   */
  async getContext(
    backgroundSystem: BackgroundActorSystem | undefined,
    conversationId: string | undefined,
    query: string,
    callerId?: string,
    traceId?: string,
  ): Promise<string> {
    if (!backgroundSystem || !backgroundSystem.initialized || !conversationId) {
      return "";
    }

    const cacheKey = `${conversationId}:${this.hashQuery(query)}`;
    const now = Date.now();

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && now - cached.timestamp < this.ttlMs) {
      actorLog("info", callerId || "context-service", `RAG cache hit for query (${query.slice(0, 50)}...)`, traceId);
      return cached.context;
    }

    // Cache miss — query RAG
    try {
      const result = await backgroundSystem.request<{
        context: string;
        chunks: Array<{ content: string; similarity: number; agentRole: string }>;
      }>(
        "retrieval",
        "retrieve_request",
        { conversationId, query },
        10_000,
      );

      const context = result.context || "";

      // Store in cache
      this.cache.set(cacheKey, { context, timestamp: now });

      // Evict stale entries periodically
      if (this.cache.size > 100) {
        this.evictStale(now);
      }

      return context;
    } catch (err) {
      actorLog("warn", callerId || "context-service", `Retrieval failed: ${err}`, traceId);
      return "";
    }
  }

  /** Clear the cache (e.g. at end of request). */
  clear(): void {
    this.cache.clear();
  }

  private hashQuery(query: string): string {
    // Simple hash for cache key — not cryptographic, just for dedup
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private evictStale(now: number): void {
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }
}
