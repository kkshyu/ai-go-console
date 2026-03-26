import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ALL_SERVICE_TYPES } from "@/lib/service-types";
import { prisma } from "@/lib/db";
import type { ServiceType } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const session = await getServerSession(authOptions);

  if (session?.user?.organizationId !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowedServices = await prisma.orgAllowedService.findMany({
    where: { organizationId: orgId },
    orderBy: { serviceType: "asc" },
  });

  return NextResponse.json(allowedServices);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const session = await getServerSession(authOptions);

  if (session?.user?.organizationId !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { services } = body as {
    services: { serviceType: ServiceType; enabled: boolean }[];
  };

  if (!services || !Array.isArray(services)) {
    return NextResponse.json(
      { error: "services array is required" },
      { status: 400 }
    );
  }

  for (const s of services) {
    if (!ALL_SERVICE_TYPES.includes(s.serviceType)) {
      return NextResponse.json(
        { error: `Invalid service type: ${s.serviceType}` },
        { status: 400 }
      );
    }
  }

  const results = await Promise.all(
    services.map((s) =>
      prisma.orgAllowedService.upsert({
        where: {
          organizationId_serviceType: {
            organizationId: orgId,
            serviceType: s.serviceType,
          },
        },
        update: { enabled: s.enabled },
        create: {
          organizationId: orgId,
          serviceType: s.serviceType,
          enabled: s.enabled,
        },
      })
    )
  );

  return NextResponse.json(results);
}
