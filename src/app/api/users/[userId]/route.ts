import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;

  // Verify user is in same org
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || (organizationId && target.organizationId !== organizationId)) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { role, name } = await request.json();

  const data: Record<string, string> = {};
  if (role) data.role = role;
  if (name) data.name = name;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || (organizationId && target.organizationId !== organizationId)) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ success: true });
}
