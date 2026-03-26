import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
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

  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ success: true });
}
