import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createOrganizationWithDefaults } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit: 5 registration attempts per IP per 15 minutes
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const { email, password, name, organizationName, organizationId } =
    await request.json();

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
  const isFirstUser = userCount === 0;
  const role = isFirstUser ? "admin" : "user";

  let orgId: string;

  if (isFirstUser) {
    const org = await createOrganizationWithDefaults(
      organizationName || "My Organization"
    );
    orgId = org.id;
  } else if (organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }
    orgId = org.id;
  } else {
    const orgName =
      organizationName ||
      `${name || email.split("@")[0]}'s Organization`;
    const org = await createOrganizationWithDefaults(orgName);
    orgId = org.id;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name: name || email.split("@")[0],
      passwordHash,
      role: role as "admin" | "user",
      organizationId: orgId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
