import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;

  const messages = await prisma.chatMessage.findMany({
    where: { appId },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, agentRole: true, stage: true, createdAt: true },
  });

  return NextResponse.json({ messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;

  const body = await request.json();
  const { role, content, agentRole, stage } = body;

  if (!role || !content) {
    return NextResponse.json(
      { error: "role and content are required" },
      { status: 400 }
    );
  }

  const message = await prisma.chatMessage.create({
    data: {
      appId,
      userId,
      role,
      content,
      ...(agentRole ? { agentRole } : {}),
      ...(stage ? { stage } : {}),
    },
  });

  return NextResponse.json(message, { status: 201 });
}
