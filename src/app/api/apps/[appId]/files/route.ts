import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppPath } from "@/lib/generator";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

/** Max file size for reading content (100KB) */
const MAX_READ_SIZE = 100 * 1024;

/** Paths that cannot be written to */
const WRITE_BLOCKED_PREFIXES = ["node_modules/", ".git/"];

function resolveAndValidate(appDir: string, subpath: string): string | null {
  const resolved = path.resolve(appDir, subpath);
  if (!resolved.startsWith(appDir)) return null;
  return resolved;
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

  const appDir = getAppPath(app.slug);
  if (!fs.existsSync(appDir)) {
    return NextResponse.json({ error: "App directory not found" }, { status: 404 });
  }

  const subpath = request.nextUrl.searchParams.get("path") || "";
  const wantContent = request.nextUrl.searchParams.get("content") === "true";

  // Prevent path traversal
  const resolved = resolveAndValidate(appDir, subpath);
  if (!resolved) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // If content=true, read a single file's content
  if (wantContent) {
    try {
      const stat = await fsp.stat(resolved);
      if (stat.isDirectory()) {
        return NextResponse.json({ error: "Path is a directory, not a file" }, { status: 400 });
      }
      if (stat.size > MAX_READ_SIZE) {
        return NextResponse.json({ error: "File too large" }, { status: 413 });
      }
      const content = await fsp.readFile(resolved, "utf-8");
      return NextResponse.json({ path: subpath, content, size: stat.size });
    } catch {
      return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
    }
  }

  try {
    const entries = await fsp.readdir(resolved, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((e) => !e.name.startsWith(".") && e.name !== "node_modules")
        .map(async (e) => {
          const fullPath = path.join(resolved, e.name);
          const stat = await fsp.stat(fullPath);
          return {
            name: e.name,
            type: e.isDirectory() ? "directory" as const : "file" as const,
            size: stat.size,
            mtime: stat.mtime.toISOString(),
          };
        })
    );

    // Sort: directories first, then by name
    files.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ path: subpath || "/", files });
  } catch {
    return NextResponse.json({ error: "Failed to read directory" }, { status: 500 });
  }
}

export async function POST(
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

  const body = await request.json();
  const { files } = body as {
    files?: Array<{ path: string; content: string }>;
  };

  if (!files || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "files array required" }, { status: 400 });
  }

  const written: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    // Validate path
    if (!file.path || typeof file.path !== "string") {
      errors.push("Invalid file path");
      continue;
    }

    // Block writes to protected directories
    const normalizedPath = file.path.replace(/\\/g, "/");
    if (WRITE_BLOCKED_PREFIXES.some((p) => normalizedPath.startsWith(p))) {
      errors.push(`Cannot write to protected path: ${file.path}`);
      continue;
    }

    const resolved = resolveAndValidate(appDir, file.path);
    if (!resolved) {
      errors.push(`Invalid path: ${file.path}`);
      continue;
    }

    try {
      await fsp.mkdir(path.dirname(resolved), { recursive: true });
      await fsp.writeFile(resolved, file.content, "utf-8");
      written.push(file.path);
    } catch (err) {
      errors.push(`Failed to write ${file.path}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  return NextResponse.json({ written: written.length, files: written, errors });
}
