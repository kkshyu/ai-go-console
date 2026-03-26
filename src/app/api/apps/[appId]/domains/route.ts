import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncCaddyRoutes } from "@/lib/proxy";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;

  const domains = await prisma.appDomain.findMany({
    where: { appId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(domains);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const { domain } = await request.json();

  if (!domain) {
    return NextResponse.json(
      { error: "Domain is required" },
      { status: 400 }
    );
  }

  // Verify app exists
  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  // Check domain uniqueness
  const existing = await prisma.appDomain.findUnique({ where: { domain } });
  if (existing) {
    return NextResponse.json(
      { error: "Domain already in use" },
      { status: 409 }
    );
  }

  const appDomain = await prisma.appDomain.create({
    data: {
      domain,
      appId,
      isActive: true,
    },
  });

  // Sync Caddy routes (non-blocking)
  syncCaddyRoutes().catch(() => {});

  return NextResponse.json(appDomain, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const body = await request.json();
  const domainId = body.domainId;

  if (!domainId) {
    return NextResponse.json({ error: "domainId is required" }, { status: 400 });
  }

  await prisma.appDomain.delete({ where: { id: domainId } });

  // Sync Caddy routes (non-blocking)
  syncCaddyRoutes().catch(() => {});

  return NextResponse.json({ success: true });
}
