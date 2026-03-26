import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { removeApp } from "@/lib/generator";
import { stopApp, getAppDockerStatus } from "@/lib/docker";
import { stopDevServer } from "@/lib/dev-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;

  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: {
      domains: true,
      credentials: {
        include: {
          credential: { select: { id: true, name: true, type: true } },
        },
      },
    },
  });

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  return NextResponse.json(app);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  // Stop running processes
  try {
    await stopDevServer(app.slug);
  } catch { /* ignore */ }
  try {
    await stopApp(app.slug);
  } catch { /* ignore */ }

  // Remove files
  await removeApp(app.slug);

  // Delete from DB
  await prisma.app.delete({ where: { id: appId } });

  return NextResponse.json({ success: true });
}
