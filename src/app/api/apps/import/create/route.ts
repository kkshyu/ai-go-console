import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { ensureBackgroundSystem } from "@/lib/actors/background-system";

/**
 * POST /api/apps/import/create
 *
 * Create an app from an import session and trigger background generation.
 * The user can close the page after this — processing continues in the background.
 *
 * Body: { importSessionId, name, slug, description }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { importSessionId, name, slug: requestedSlug, description } = body;

  if (!importSessionId || !name) {
    return NextResponse.json(
      { error: "importSessionId and name are required" },
      { status: 400 }
    );
  }

  // Verify import session belongs to this user
  const importSession = await prisma.importSession.findUnique({
    where: { importSessionId },
  });

  if (!importSession || importSession.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Import session not found" },
      { status: 404 }
    );
  }

  // Generate slug
  let slug = requestedSlug ? slugify(requestedSlug) : slugify(name);
  if (!slug) slug = `app-${Date.now().toString(36)}`;
  const existing = await prisma.app.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // Create app with "importing" status
  const app = await prisma.app.create({
    data: {
      name,
      slug,
      description,
      template: "blank",
      status: "importing",
      config: {},
      userId: session.user.id,
    },
  });

  // Link app to import session
  await prisma.importSession.update({
    where: { importSessionId },
    data: {
      appId: app.id,
      status: "creating",
    },
  });

  // Fetch org slug for container naming
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { organization: { select: { slug: true } } },
  });
  const orgSlug = user?.organization?.slug || "default";

  // Trigger background generation + autostart
  try {
    const backgroundSystem = await ensureBackgroundSystem();
    backgroundSystem.fireAndForget("import_orchestrator", "generate_and_start", {
      appId: app.id,
      importSessionId,
      orgSlug,
    });
  } catch (err) {
    console.error("[import/create] Failed to enqueue orchestrator:", err);
    // Don't fail the request — the app is created, user can retry later
  }

  return NextResponse.json(app, { status: 201 });
}
