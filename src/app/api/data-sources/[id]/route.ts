import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ds = await prisma.dataSource.findUnique({
    where: { id },
    select: { id: true, name: true, type: true, createdAt: true, updatedAt: true },
  });

  if (!ds) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(ds);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, type, host, port, database, username, password, apiKey, projectUrl } = body;

  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (type) data.type = type;

  // If any credential fields provided, re-encrypt
  if (host || port || database || username || password || apiKey || projectUrl) {
    const credentials = JSON.stringify({
      host, port, database, username, password, apiKey, projectUrl,
    });
    const { ciphertext, iv, authTag } = encrypt(credentials);
    data.credentialsEncrypted = ciphertext;
    data.iv = iv;
    data.authTag = authTag;
  }

  const ds = await prisma.dataSource.update({
    where: { id },
    data,
    select: { id: true, name: true, type: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(ds);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.dataSource.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
