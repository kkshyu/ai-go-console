import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Verify that the current session user owns (or is in the same org as) the given app.
 * Returns the session and app if authorized, or a NextResponse error.
 */
export async function authorizeAppAccess(appId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: { user: { select: { organizationId: true } } },
  });

  if (!app) {
    return { error: NextResponse.json({ error: "App not found" }, { status: 404 }) };
  }

  // Check that the requesting user belongs to the same organization as the app owner
  if (app.user.organizationId !== session.user.organizationId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session, app };
}
