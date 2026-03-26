import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;

  const where = organizationId ? { organizationId } : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}
