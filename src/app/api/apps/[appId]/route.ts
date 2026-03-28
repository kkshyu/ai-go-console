import { NextRequest, NextResponse } from "next/server";
import { prisma, getOrgSlug } from "@/lib/db";
import { removeApp } from "@/lib/generator";
import { stopApp } from "@/lib/k8s/deployment";
import { stopDevServer } from "@/lib/dev-server";
import { slugify } from "@/lib/utils";
import { authorizeAppAccess } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const auth = await authorizeAppAccess(appId);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { slug } = body;

  const data: { slug?: string } = {};

  if (slug !== undefined) {
    const newSlug = slugify(slug);
    if (!newSlug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }
    const existing = await prisma.app.findFirst({
      where: { slug: newSlug, id: { not: appId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }
    data.slug = newSlug;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(auth.app);
  }

  const updated = await prisma.app.update({
    where: { id: appId },
    data,
    include: {
      services: {
        include: {
          service: { select: { id: true, name: true, type: true } },
        },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const auth = await authorizeAppAccess(appId);
  if ("error" in auth) return auth.error;

  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: {
      services: {
        include: {
          service: { select: { id: true, name: true, type: true } },
        },
      },
      user: {
        select: {
          organization: { select: { slug: true } },
        },
      },
    },
  });

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const { user, ...rest } = app;
  return NextResponse.json({ ...rest, orgSlug: user.organization.slug });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const auth = await authorizeAppAccess(appId);
  if ("error" in auth) return auth.error;

  const orgSlug = await getOrgSlug(auth.app.userId);

  // Stop running processes
  try {
    await stopDevServer(orgSlug, auth.app.slug);
  } catch { /* ignore */ }
  try {
    await stopApp(orgSlug, auth.app.slug);
  } catch { /* ignore */ }

  // Remove files
  await removeApp(orgSlug, auth.app.slug);

  // Delete from DB
  await prisma.app.delete({ where: { id: appId } });

  return NextResponse.json({ success: true });
}
