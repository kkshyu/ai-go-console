import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;
  const { orgId } = await params;

  if (!organizationId || organizationId !== orgId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { name, slug } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const data: { name: string; slug?: string } = { name: name.trim() };

  if (slug !== undefined) {
    const newSlug = slugify(slug);
    if (!newSlug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }
    const existing = await prisma.organization.findFirst({
      where: { slug: newSlug, id: { not: orgId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }
    data.slug = newSlug;
  }

  const org = await prisma.organization.update({
    where: { id: orgId },
    data,
  });

  return NextResponse.json(org);
}
