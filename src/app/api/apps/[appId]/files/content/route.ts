import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppPath } from "@/lib/generator";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;

  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const appDir = getAppPath(app.slug);
  if (!fs.existsSync(appDir)) {
    return NextResponse.json({ error: "App directory not found" }, { status: 404 });
  }

  const filePath = request.nextUrl.searchParams.get("path") || "";
  if (!filePath) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 });
  }

  // Prevent path traversal
  const resolved = path.resolve(appDir, filePath);
  if (!resolved.startsWith(appDir)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const stat = await fsp.stat(resolved);
    if (stat.isDirectory()) {
      return NextResponse.json({ error: "Path is a directory" }, { status: 400 });
    }
    if (stat.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large", size: stat.size }, { status: 413 });
    }

    const content = await fsp.readFile(resolved, "utf-8");
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

  const appDir = getAppPath(app.slug);
  if (!fs.existsSync(appDir)) {
    return NextResponse.json({ error: "App directory not found" }, { status: 404 });
  }

  const filePath = request.nextUrl.searchParams.get("path") || "";
  if (!filePath) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 });
  }

  // Prevent path traversal
  const resolved = path.resolve(appDir, filePath);
  if (!resolved.startsWith(appDir)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { content } = body;
    if (typeof content !== "string") {
      return NextResponse.json({ error: "Content must be a string" }, { status: 400 });
    }

    await fsp.writeFile(resolved, content, "utf-8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to write file" }, { status: 500 });
  }
}
