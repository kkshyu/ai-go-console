/**
 * Activity Archiver — Dump >24h events to MinIO
 *
 * Opportunistic archival: triggered at most every 5 minutes,
 * with a distributed Redis lock to prevent concurrent runs.
 * Write-then-delete: MinIO write must succeed before Redis cleanup.
 */

import { gzipSync } from "zlib";
import { Client } from "minio";
import { getRedis } from "@/lib/redis";
import {
  REDIS_ARCHIVE_LOCK_KEY,
  ACTIVITY_RETENTION_MS,
} from "./activity-types";
import { readActivityRange, removeActivityBefore } from "./activity-feed";

// ── Configuration ───────────────────────────────────────────────────────────

const ARCHIVE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const LOCK_TTL_SECONDS = 300; // 5 minutes
const ARCHIVE_BUCKET = "agents-observability";

// ── In-process rate limit ───────────────────────────────────────────────────

let _lastArchiveAttempt = 0;

// ── MinIO Client (separate from import-files client) ────────────────────────

let _archiveClient: Client | null = null;

function getArchiveClient(): Client {
  if (_archiveClient) return _archiveClient;

  const endpoint = process.env.PLATFORM_MINIO_URL || "http://localhost:9000";
  const url = new URL(endpoint);

  _archiveClient = new Client({
    endPoint: url.hostname,
    port: Number(url.port) || 9000,
    useSSL: url.protocol === "https:",
    accessKey: process.env.PLATFORM_MINIO_ROOT_USER || "minioadmin",
    secretKey: process.env.PLATFORM_MINIO_ROOT_PASSWORD || "minioadmin",
  });

  return _archiveClient;
}

async function ensureArchiveBucket(): Promise<void> {
  const client = getArchiveClient();
  const exists = await client.bucketExists(ARCHIVE_BUCKET);
  if (!exists) {
    await client.makeBucket(ARCHIVE_BUCKET);
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export type ArchiveResult =
  | { archived: number }
  | { skipped: string }
  | { error: string };

/**
 * Archive activity events older than 24h to MinIO.
 *
 * Flow:
 * 1. In-process cooldown check (5 min)
 * 2. Acquire distributed Redis lock
 * 3. Read expired events from ZSET
 * 4. Compress as NDJSON gzip → upload to MinIO
 * 5. Delete from Redis only after successful write
 */
export async function maybeArchiveOldActivity(): Promise<ArchiveResult> {
  const now = Date.now();

  // Rate limit: at most once per 5 minutes
  if (now - _lastArchiveAttempt < ARCHIVE_COOLDOWN_MS) {
    return { skipped: "too_soon" };
  }
  _lastArchiveAttempt = now;

  const redis = getRedis();

  // Acquire distributed lock
  const lockValue = `${process.pid}-${now}`;
  const acquired = await redis.set(
    REDIS_ARCHIVE_LOCK_KEY,
    lockValue,
    "EX",
    LOCK_TTL_SECONDS,
    "NX",
  );
  if (!acquired) {
    return { skipped: "locked" };
  }

  try {
    const cutoff = now - ACTIVITY_RETENTION_MS;

    // Read expired events
    const events = await readActivityRange(0, cutoff);
    if (events.length === 0) {
      return { archived: 0 };
    }

    // Build NDJSON and compress
    const ndjson = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
    const compressed = gzipSync(Buffer.from(ndjson));

    // Build MinIO key from first event timestamp (UTC)
    const firstTs = events[0].timestamp;
    const lastTs = events[events.length - 1].timestamp;
    const d = new Date(firstTs);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const key = `activity/${yyyy}/${mm}/${dd}/${hh}/${firstTs}_${lastTs}.ndjson.gz`;

    // Upload to MinIO (write-first)
    try {
      await ensureArchiveBucket();
      const client = getArchiveClient();
      await client.putObject(ARCHIVE_BUCKET, key, compressed, compressed.length);
    } catch {
      // MinIO unavailable — do NOT delete from Redis
      return { error: "minio_unavailable" };
    }

    // MinIO write succeeded — now safe to delete from Redis
    await removeActivityBefore(cutoff);
    return { archived: events.length };
  } finally {
    // Release lock
    await redis.del(REDIS_ARCHIVE_LOCK_KEY).catch(() => {});
  }
}
