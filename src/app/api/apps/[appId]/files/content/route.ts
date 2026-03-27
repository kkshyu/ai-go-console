import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as sandbox from "@/lib/docker-sandbox";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

function validatePath(filePath: string): boolean {
  if (!filePath) return false;
  if (filePath.includes("..")) return false;
  if (filePath.startsWith("/")) return false;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const status = await sandbox.getDevContainerStatus(app.slug);
  if (status === "not_found") {
    return NextResponse.json({ error: "App container not found" }, { status: 404 });
  }

  const filePath = request.nextUrl.searchParams.get("path") || "";
  if (!validatePath(filePath)) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 });
  }

  try {
    const content = await sandbox.readFile(app.slug, filePath);
    const size = Buffer.byteLength(content, "utf-8");
    if (size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large", size }, { status: 413 });
    }
    return NextResponse.json({ content, path: filePath });
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const status = await sandbox.getDevContainerStatus(app.slug);
  if (status === "not_found") {
    return NextResponse.json({ error: "App container not found" }, { status: 404 });
  }

  const filePath = request.nextUrl.searchParams.get("path") || "";
  if (!validatePath(filePath)) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { content } = body;
    if (typeof content !== "string") {
      return NextResponse.json({ error: "Content must be a string" }, { status: 400 });
    }

    await sandbox.writeFiles(app.slug, [{ path: filePath, content }]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to write file" }, { status: 500 });
  }
}
