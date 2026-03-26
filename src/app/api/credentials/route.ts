import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const credentials = await prisma.credential.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(credentials);
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

  const creds = JSON.stringify({
    host,
    port,
    database,
    username,
    password,
    apiKey,
    projectUrl,
  });

  const { ciphertext, iv, authTag } = encrypt(creds);

  const credential = await prisma.credential.create({
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

  return NextResponse.json(credential, { status: 201 });
}
