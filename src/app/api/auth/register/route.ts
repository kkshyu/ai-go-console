import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { email, password, name } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  // First user becomes admin
  const userCount = await prisma.user.count();
  const role = userCount === 0 ? "admin" : "user";

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name: name || email.split("@")[0],
      passwordHash,
      role: role as "admin" | "user",
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
