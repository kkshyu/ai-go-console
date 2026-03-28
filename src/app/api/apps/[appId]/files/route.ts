import { NextRequest, NextResponse } from "next/server";
import { getOrgSlug } from "@/lib/db";
import * as sandbox from "@/lib/k8s/sandbox";
import type { ContainerType } from "@/lib/k8s/sandbox";
import { authorizeAppAccess } from "@/lib/api-auth";

/** Paths that cannot be written to */
const WRITE_BLOCKED_PREFIXES = ["node_modules/", ".git/"];

function validatePath(subpath: string): boolean {
  // Prevent path traversal
  if (subpath.includes("..")) return false;
  // Prevent absolute paths
  if (subpath.startsWith("/")) return false;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const auth = await authorizeAppAccess(appId);
  if ("error" in auth) return auth.error;

  const app = auth.app;
  const orgSlug = await getOrgSlug(app.userId);
  const containerType = (request.nextUrl.searchParams.get("containerType") || "dev") as ContainerType;

  // Check container exists
  const status = await sandbox.getContainerStatus(orgSlug, app.slug, containerType);
  if (status === "not_found") {
    return NextResponse.json({ error: "App container not found" }, { status: 404 });
  }

  const subpath = request.nextUrl.searchParams.get("path") || "";
  const wantContent = request.nextUrl.searchParams.get("content") === "true";

  if (subpath && !validatePath(subpath)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // Read single file content
  if (wantContent) {
    try {
      const content = await sandbox.readFile(orgSlug, app.slug, subpath, containerType);
      return NextResponse.json({
        path: subpath,
        content,
        size: Buffer.byteLength(content, "utf-8"),
      });
    } catch {
      return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
    }
  }

  // Read directory listing
  try {
    const files = await sandbox.readDirectory(orgSlug, app.slug, subpath, containerType);
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
  const auth = await authorizeAppAccess(appId);
  if ("error" in auth) return auth.error;

  const app = auth.app;
  const orgSlug = await getOrgSlug(app.userId);
  const containerType = (request.nextUrl.searchParams.get("containerType") || "dev") as ContainerType;

  // Check container exists
  const status = await sandbox.getContainerStatus(orgSlug, app.slug, containerType);
  if (status === "not_found") {
    return NextResponse.json({ error: "App container not found" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") || "";

  // JSON body: agent modify_files action
  if (contentType.includes("application/json")) {
    const body = await request.json();
    const { files } = body as {
      files?: Array<{ path: string; content: string }>;
    };

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "files array required" }, { status: 400 });
    }

    const validFiles: Array<{ path: string; content: string }> = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!file.path || typeof file.path !== "string") {
        errors.push("Invalid file path");
        continue;
      }

      const normalizedPath = file.path.replace(/\\/g, "/");

      if (!validatePath(normalizedPath)) {
        errors.push(`Invalid path: ${file.path}`);
        continue;
      }

      if (WRITE_BLOCKED_PREFIXES.some((p) => normalizedPath.startsWith(p))) {
        errors.push(`Cannot write to protected path: ${file.path}`);
        continue;
      }

      validFiles.push({ path: normalizedPath, content: file.content });
    }

    try {
      await sandbox.writeFiles(orgSlug, app.slug, validFiles, containerType);
    } catch (err) {
      errors.push(`Failed to write files: ${err instanceof Error ? err.message : "unknown"}`);
    }

    return NextResponse.json({
      written: validFiles.length,
      files: validFiles.map((f) => f.path),
      errors,
    });
  }

  // FormData body: file upload from UI
  try {
    const formData = await request.formData();
    const basePath = (formData.get("basePath") as string) || "";
    const uploadedFiles = formData.getAll("files") as File[];
    const relativePaths = formData.getAll("relativePaths") as string[];

    const filesToWrite: Array<{ path: string; content: string }> = [];
    const binaryFiles: Array<{ path: string; buffer: Buffer }> = [];
    let uploaded = 0;
    const uploadedFileNames: string[] = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const relativePath = relativePaths[i] || file.name;
      const targetPath = basePath
        ? `${basePath}/${relativePath}`
        : relativePath;

      if (!validatePath(targetPath)) continue;

      const buffer = Buffer.from(await file.arrayBuffer());

      // Try to handle as text, fall back to binary
      try {
        const textContent = buffer.toString("utf-8");
        filesToWrite.push({ path: targetPath, content: textContent });
      } catch {
        binaryFiles.push({ path: targetPath, buffer });
      }

      uploaded++;
      uploadedFileNames.push(relativePath);
    }

    // Write text files in bulk
    if (filesToWrite.length > 0) {
      await sandbox.writeFiles(orgSlug, app.slug, filesToWrite, containerType);
    }

    // Write binary files individually
    for (const bf of binaryFiles) {
      await sandbox.writeFileBuffer(orgSlug, app.slug, bf.path, bf.buffer, containerType);
    }

    return NextResponse.json({ uploaded, files: uploadedFileNames });
  } catch {
    return NextResponse.json({ error: "Failed to upload files" }, { status: 500 });
  }
}
