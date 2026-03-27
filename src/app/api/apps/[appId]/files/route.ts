import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppPath } from "@/lib/generator";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

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

  // Prevent path traversal
  const resolved = path.resolve(appDir, subpath);
  if (!resolved.startsWith(appDir)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
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
