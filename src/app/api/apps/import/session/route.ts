import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/apps/import/session?appId=X
 *
 * Returns the ImportSession record for a given app.
 * Used by the app detail page to show import progress.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appId = request.nextUrl.searchParams.get("appId");
  if (!appId) {
    return NextResponse.json(
      { error: "appId is required" },
      { status: 400 }
    );
  }

  const importSession = await prisma.importSession.findFirst({
    where: {
      appId,
      userId: session.user.id,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!importSession) {
    return NextResponse.json(
      { error: "Import session not found" },
      { status: 404 }
    );
  }

  // Parse progressDetail JSON if present
  let progressDetail = null;
  if (importSession.progressDetail) {
    try {
      progressDetail = JSON.parse(importSession.progressDetail);
    } catch {
      // Ignore parse errors
    }
  }

  return NextResponse.json({
    id: importSession.id,
    status: importSession.status,
    fileCount: importSession.fileCount,
    errorMessage: importSession.errorMessage,
    progressMessage: importSession.progressMessage,
    progressDetail,
    createdAt: importSession.createdAt,
    updatedAt: importSession.updatedAt,
  });
}
