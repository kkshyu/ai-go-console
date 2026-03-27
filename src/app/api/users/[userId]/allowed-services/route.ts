import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify target user is in same org
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const allowed = await prisma.userAllowedServiceInstance.findMany({
    where: { userId },
    include: {
      service: { select: { id: true, name: true, type: true } },
    },
  });

  return NextResponse.json(allowed.map((a) => a.service));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Verify target user is in same org
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { serviceIds } = (await request.json()) as { serviceIds: string[] };
  if (!Array.isArray(serviceIds)) {
    return NextResponse.json({ error: "serviceIds array required" }, { status: 400 });
  }

  // Verify all service IDs belong to this org
  const services = await prisma.service.findMany({
    where: {
      id: { in: serviceIds },
      organizationId: session.user.organizationId,
    },
    select: { id: true },
  });
  const validIds = new Set(services.map((s) => s.id));

  // Replace all: delete existing, create new
  await prisma.$transaction([
    prisma.userAllowedServiceInstance.deleteMany({ where: { userId } }),
    ...serviceIds
      .filter((id) => validIds.has(id))
      .map((serviceId) =>
        prisma.userAllowedServiceInstance.create({
          data: { userId, serviceId },
        })
      ),
  ]);

  // Return updated list
  const updated = await prisma.userAllowedServiceInstance.findMany({
    where: { userId },
    include: {
      service: { select: { id: true, name: true, type: true } },
    },
  });

  return NextResponse.json(updated.map((a) => a.service));
}
