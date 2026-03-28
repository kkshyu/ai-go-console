import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncRoutes } from "@/lib/k8s/ingress";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const session = await getServerSession(authOptions);

  if (session?.user?.organizationId !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const domains = await prisma.orgDomain.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(domains);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const session = await getServerSession(authOptions);

  if (session?.user?.organizationId !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { domain } = await request.json();

  if (!domain) {
    return NextResponse.json(
      { error: "Domain is required" },
      { status: 400 }
    );
  }

  // Check domain uniqueness
  const existing = await prisma.orgDomain.findUnique({ where: { domain } });
  if (existing) {
    return NextResponse.json(
      { error: "Domain already in use" },
      { status: 409 }
    );
  }

  const orgDomain = await prisma.orgDomain.create({
    data: {
      domain,
      organizationId: orgId,
      isActive: true,
    },
  });

  // Sync Traefik routes (non-blocking)
  syncRoutes().catch(() => {});

  return NextResponse.json(orgDomain, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const session = await getServerSession(authOptions);

  if (session?.user?.organizationId !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const domainId = body.domainId;

  if (!domainId) {
    return NextResponse.json({ error: "domainId is required" }, { status: 400 });
  }

  // Verify domain belongs to this org
  const domain = await prisma.orgDomain.findFirst({
    where: { id: domainId, organizationId: orgId },
  });
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  await prisma.orgDomain.delete({ where: { id: domainId } });

  // Sync Traefik routes (non-blocking)
  syncRoutes().catch(() => {});

  return NextResponse.json({ success: true });
}
