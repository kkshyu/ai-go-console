import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/apps/import/status?sessionId=X
 *
 * Poll the processing progress of an import session.
 * Returns counts by status so the UI can show a progress bar.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 }
    );
  }

  // Verify the session belongs to this user
  const sample = await prisma.chatFile.findFirst({
    where: { importSessionId: sessionId, userId: session.user.id },
    select: { id: true },
  });

  if (!sample) {
    return NextResponse.json(
      { error: "Import session not found" },
      { status: 404 }
    );
  }

  const counts = await prisma.chatFile.groupBy({
    by: ["status"],
    where: { importSessionId: sessionId },
    _count: true,
  });

  const result = { total: 0, uploaded: 0, processing: 0, ready: 0, error: 0 };
  for (const row of counts) {
    const count = row._count;
    result.total += count;
    switch (row.status) {
      case "uploaded":
        result.uploaded += count;
        break;
      case "processing":
        result.processing += count;
        break;
      case "ready":
        result.ready += count;
        break;
      case "error":
        result.error += count;
        break;
    }
  }

  return NextResponse.json(result);
}
