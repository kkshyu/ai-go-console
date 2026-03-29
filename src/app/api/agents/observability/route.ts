import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { actorSystemRegistry } from "@/lib/actors/registry";
import { getAllQueueStats } from "@/lib/queue";
import { readActivityFeed } from "@/lib/agents/activity-feed";
import { maybeArchiveOldActivity } from "@/lib/agents/activity-archiver";
import type { ActivitySource, ActivityLevel } from "@/lib/agents/activity-types";

const MAX_LIMIT = 500;
const VALID_SOURCES = new Set(["actor", "queue", "system"]);
const VALID_LEVELS = new Set(["info", "warn", "error"]);

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;

  const limitParam = parseInt(searchParams.get("limit") || "100", 10);
  const limit = Math.min(Math.max(1, limitParam || 100), MAX_LIMIT);

  const sourceParam = searchParams.get("source");
  const source =
    sourceParam && VALID_SOURCES.has(sourceParam)
      ? (sourceParam as ActivitySource)
      : undefined;

  const levelParam = searchParams.get("level");
  const level =
    levelParam && VALID_LEVELS.has(levelParam)
      ? (levelParam as ActivityLevel)
      : undefined;

  const [sessions, queues, activityFeed, archiveResult] = await Promise.all([
    Promise.resolve(actorSystemRegistry.getAllSessions()),
    getAllQueueStats().catch(() => ({})),
    readActivityFeed({ limit, source, level }),
    maybeArchiveOldActivity().catch(() => ({ skipped: "archive_error" })),
  ]);

  return NextResponse.json({
    sessions,
    queues,
    activityFeed,
    archiveStatus: archiveResult,
    meta: {
      timestamp: Date.now(),
      sessionCount: sessions.length,
      activityCount: activityFeed.length,
    },
  });
}
