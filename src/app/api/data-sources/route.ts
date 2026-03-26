import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const dataSources = await prisma.dataSource.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(dataSources);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, type, host, port, database, username, password, apiKey, projectUrl } =
    body;

  if (!name || !type) {
    return NextResponse.json(
      { error: "Name and type are required" },
      { status: 400 }
    );
  }

  const credentials = JSON.stringify({
    host,
    port,
    database,
    username,
    password,
    apiKey,
    projectUrl,
  });

  const { ciphertext, iv, authTag } = encrypt(credentials);

  const dataSource = await prisma.dataSource.create({
    data: {
      name,
      type: type as "postgres" | "supabase" | "mysql" | "redis",
      credentialsEncrypted: ciphertext,
      iv,
      authTag,
    },
    select: {
      id: true,
      name: true,
      type: true,
      createdAt: true,
    },
  });

  return NextResponse.json(dataSource, { status: 201 });
}
