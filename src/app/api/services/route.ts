import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { isBuiltInServiceType } from "@/lib/service-types";
import type { ServiceType } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;

  const where = organizationId ? { organizationId } : {};

  const services = await prisma.service.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      endpointUrl: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const servicesWithMeta = services.map((s) => ({
    ...s,
    builtIn: isBuiltInServiceType(s.type),
  }));

  return NextResponse.json(servicesWithMeta);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;

  if (!organizationId) {
    return NextResponse.json(
      { error: "Organization context required" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { name, type, endpointUrl, ...configFields } = body;

  if (!name || !type) {
    return NextResponse.json(
      { error: "Name and type are required" },
      { status: 400 }
    );
  }

  if (isBuiltInServiceType(type as ServiceType)) {
    return NextResponse.json(
      { error: "Built-in services are managed by the platform" },
      { status: 403 }
    );
  }

  // Validate service type is allowed for this org
  const allowed = await prisma.orgAllowedService.findUnique({
    where: {
      organizationId_serviceType: {
        organizationId,
        serviceType: type,
      },
    },
  });

  if (!allowed || !allowed.enabled) {
    return NextResponse.json(
      { error: `Service type "${type}" is not enabled for your organization` },
      { status: 403 }
    );
  }

  const config = JSON.stringify(configFields);
  const { ciphertext, iv, authTag } = encrypt(config);

  const service = await prisma.service.create({
    data: {
      name,
      type,
      endpointUrl: endpointUrl || null,
      configEncrypted: ciphertext,
      iv,
      authTag,
      organizationId,
    },
    select: {
      id: true,
      name: true,
      type: true,
      endpointUrl: true,
      createdAt: true,
    },
  });

  return NextResponse.json(service, { status: 201 });
}
