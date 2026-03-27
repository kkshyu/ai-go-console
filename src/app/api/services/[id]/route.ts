import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { isBuiltInServiceType } from "@/lib/service-types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;

  const service = await prisma.service.findUnique({
    where: { id },
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

  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (organizationId && service.organizationId !== organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(service);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;

  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (organizationId && existing.organizationId !== organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, type, endpointUrl, ...configFields } = body;

  // Built-in services: only allow name changes
  if (isBuiltInServiceType(existing.type)) {
    const data: Record<string, unknown> = {};
    if (name) data.name = name;
    const service = await prisma.service.update({
      where: { id },
      data,
      select: {
        id: true, name: true, type: true, endpointUrl: true,
        createdAt: true, updatedAt: true,
      },
    });
    return NextResponse.json(service);
  }

  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (type) data.type = type;
  if (endpointUrl !== undefined) data.endpointUrl = endpointUrl || null;

  // If any config fields provided, re-encrypt
  const hasConfigFields = Object.values(configFields).some((v) => v);
  if (hasConfigFields) {
    const config = JSON.stringify(configFields);
    const { ciphertext, iv, authTag } = encrypt(config);
    data.configEncrypted = ciphertext;
    data.iv = iv;
    data.authTag = authTag;
  }

  const service = await prisma.service.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      type: true,
      endpointUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(service);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;

  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (organizationId && existing.organizationId !== organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isBuiltInServiceType(existing.type)) {
    return NextResponse.json(
      { error: "Built-in services cannot be deleted" },
      { status: 403 }
    );
  }

  await prisma.service.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
