import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllQueueStats } from "@/lib/queue";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getAllQueueStats();
    return NextResponse.json({ queues: stats });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to get worker status", details: String(err) },
      { status: 500 },
    );
  }
}
