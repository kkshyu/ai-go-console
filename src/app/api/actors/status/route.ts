import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { actorSystemRegistry } from "@/lib/actors/registry";
import { getAllQueueStats } from "@/lib/queue";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessions = actorSystemRegistry.getAllSessions();

  let queues = {};
  try {
    queues = await getAllQueueStats();
  } catch {
    // Redis may be unavailable
  }

  return NextResponse.json({ sessions, queues });
}
