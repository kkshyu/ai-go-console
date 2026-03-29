/**
 * Backup & Snapshot Utilities
 *
 * Provides pre-operation snapshots for destructive actions (publish, delete).
 * Snapshots are stored as JSON files in local filesystem (dev) or MinIO (prod).
 */

import fsp from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";

// ── Configuration ───────────────────────────────────────────────────────────

const SNAPSHOT_DIR = path.join(
  process.env.FILE_STORAGE_PATH || path.join(process.cwd(), ".data"),
  "backups",
  "snapshots",
);

const SNAPSHOT_RETENTION_DAYS = 30;

// ── Types ───────────────────────────────────────────────────────────────────

interface AppSnapshot {
  meta: {
    snapshotId: string;
    operation: string;
    appId: string;
    appSlug: string;
    orgSlug: string;
    timestamp: string;
    version: string;
  };
  app: Record<string, unknown>;
  deployments: Record<string, unknown>[];
  appServices: Record<string, unknown>[];
  chatMessages: { count: number; lastMessageAt: string | null };
  chatFiles: { count: number; totalSizeBytes: number };
  importSessions: Record<string, unknown>[];
}

// ── Core Functions ──────────────────────────────────────────────────────────

/**
 * Create a pre-operation snapshot of an app and its related data.
 * Called before destructive operations (publish, delete) to enable recovery.
 */
export async function createPreOperationSnapshot(
  operation: string,
  appId: string,
): Promise<string> {
  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: {
      user: {
        select: {
          organization: { select: { slug: true } },
        },
      },
      services: {
        include: {
          service: { select: { id: true, name: true, type: true } },
        },
      },
    },
  });

  if (!app) {
    throw new Error(`App not found: ${appId}`);
  }

  const orgSlug = app.user.organization.slug;
  const { user, ...appData } = app;

  // Gather related data
  const [deployments, chatMessageStats, chatFileStats, importSessions] =
    await Promise.all([
      prisma.deployment.findMany({
        where: { appId },
        orderBy: { version: "desc" },
      }),
      prisma.chatMessage.aggregate({
        where: { appId },
        _count: true,
        _max: { createdAt: true },
      }),
      prisma.chatFile.aggregate({
        where: { userId: app.userId },
        _count: true,
        _sum: { sizeBytes: true },
      }),
      prisma.importSession.findMany({
        where: { appId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const timestamp = new Date().toISOString();
  const snapshotId = `${operation}_${app.slug}_${timestamp.replace(/[:.]/g, "-")}`;

  const snapshot: AppSnapshot = {
    meta: {
      snapshotId,
      operation,
      appId,
      appSlug: app.slug,
      orgSlug,
      timestamp,
      version: "1.0",
    },
    app: appData as unknown as Record<string, unknown>,
    deployments: deployments as unknown as Record<string, unknown>[],
    appServices: app.services as unknown as Record<string, unknown>[],
    chatMessages: {
      count: chatMessageStats._count,
      lastMessageAt: chatMessageStats._max.createdAt?.toISOString() ?? null,
    },
    chatFiles: {
      count: chatFileStats._count,
      totalSizeBytes: chatFileStats._sum.sizeBytes ?? 0,
    },
    importSessions: importSessions as unknown as Record<string, unknown>[],
  };

  // Write snapshot to filesystem
  await ensureSnapshotDir();
  const filePath = path.join(SNAPSHOT_DIR, `${snapshotId}.json`);
  await fsp.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf-8");

  return snapshotId;
}

/**
 * Restore app data from a snapshot.
 * Re-creates the app record and its service mappings if they were deleted.
 */
export async function restoreFromSnapshot(
  snapshotId: string,
): Promise<{ restored: boolean; appId: string }> {
  const snapshot = await readSnapshot(snapshotId);
  if (!snapshot) {
    throw new Error(`Snapshot not found: ${snapshotId}`);
  }

  const appData = snapshot.app as Record<string, unknown>;
  const appId = appData.id as string;

  // Check if app still exists
  const existingApp = await prisma.app.findUnique({ where: { id: appId } });
  if (existingApp) {
    return { restored: false, appId };
  }

  // Re-create app
  await prisma.app.create({
    data: {
      id: appData.id as string,
      name: appData.name as string,
      slug: appData.slug as string,
      description: (appData.description as string) || null,
      template: appData.template as string,
      status: "stopped",
      config: (appData.config as object) || {},
      userId: appData.userId as string,
      port: (appData.port as number) || null,
      memoryLimitMb: (appData.memoryLimitMb as number) || null,
      cpuLimitMillis: (appData.cpuLimitMillis as number) || null,
    },
  });

  // Re-create service mappings
  for (const as of snapshot.appServices) {
    const mapping = as as Record<string, unknown>;
    try {
      await prisma.appService.create({
        data: {
          appId: mapping.appId as string,
          serviceId: mapping.serviceId as string,
          envVarPrefix: (mapping.envVarPrefix as string) || undefined,
        },
      });
    } catch {
      // Service may no longer exist, skip
    }
  }

  return { restored: true, appId };
}

/**
 * List available snapshots, optionally filtered by appId.
 */
export async function listSnapshots(
  appId?: string,
): Promise<
  Array<{
    snapshotId: string;
    operation: string;
    appSlug: string;
    timestamp: string;
    filePath: string;
  }>
> {
  await ensureSnapshotDir();

  const files = await fsp.readdir(SNAPSHOT_DIR);
  const snapshots: Array<{
    snapshotId: string;
    operation: string;
    appSlug: string;
    timestamp: string;
    filePath: string;
  }> = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const filePath = path.join(SNAPSHOT_DIR, file);
    try {
      const content = await fsp.readFile(filePath, "utf-8");
      const data = JSON.parse(content) as AppSnapshot;
      if (appId && data.meta.appId !== appId) continue;
      snapshots.push({
        snapshotId: data.meta.snapshotId,
        operation: data.meta.operation,
        appSlug: data.meta.appSlug,
        timestamp: data.meta.timestamp,
        filePath,
      });
    } catch {
      // Skip corrupted snapshots
    }
  }

  return snapshots.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

/**
 * Clean up old snapshots beyond retention period.
 */
export async function cleanupOldSnapshots(): Promise<number> {
  await ensureSnapshotDir();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SNAPSHOT_RETENTION_DAYS);

  const files = await fsp.readdir(SNAPSHOT_DIR);
  let removed = 0;

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const filePath = path.join(SNAPSHOT_DIR, file);
    try {
      const stat = await fsp.stat(filePath);
      if (stat.mtime < cutoff) {
        await fsp.unlink(filePath);
        removed++;
      }
    } catch {
      // Skip
    }
  }

  return removed;
}

// ── Internal Helpers ────────────────────────────────────────────────────────

async function ensureSnapshotDir(): Promise<void> {
  await fsp.mkdir(SNAPSHOT_DIR, { recursive: true });
}

async function readSnapshot(snapshotId: string): Promise<AppSnapshot | null> {
  const filePath = path.join(SNAPSHOT_DIR, `${snapshotId}.json`);
  try {
    const content = await fsp.readFile(filePath, "utf-8");
    return JSON.parse(content) as AppSnapshot;
  } catch {
    return null;
  }
}
