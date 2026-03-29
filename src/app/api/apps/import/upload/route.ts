import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, getOrgSlug } from "@/lib/db";
import { writeFileToMinIO, buildImportFileKey } from "@/lib/minio-storage";
import { randomUUID } from "node:crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import ignore from "ignore";

/** Max size for a single file (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** Max total files per import session */
const MAX_FILES = 500;

/** Hardcoded baseline directories to always skip */
const SKIP_DIRS = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".cache",
  "__pycache__",
  ".svn",
  "vendor",
  ".DS_Store",
];

function detectFileType(mimeType: string, fileName: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/javascript" ||
    mimeType === "application/typescript" ||
    /\.(ts|tsx|js|jsx|py|go|rs|java|kt|swift|rb|php|c|cpp|h|hpp|vue|svelte|sql|sh|yaml|yml|toml|ini|cfg|conf|env|log|csv|md|prisma|graphql)$/i.test(
      fileName
    )
  ) {
    return "code";
  }
  return "unknown";
}

/**
 * Build an ignore filter from .gitignore and .dockerignore contents found
 * in the uploaded files, combined with the hardcoded SKIP_DIRS baseline.
 */
function buildIgnoreFilter(
  files: File[],
  paths: string[],
  ignoreContents: Map<string, string>,
): (relativePath: string) => boolean {
  const ig = ignore();

  // Always skip baseline dirs
  for (const dir of SKIP_DIRS) {
    ig.add(dir);
    ig.add(`${dir}/`);
  }

  // Add patterns from .gitignore
  const gitignore = ignoreContents.get(".gitignore");
  if (gitignore) {
    ig.add(gitignore);
  }

  // Add patterns from .dockerignore
  const dockerignore = ignoreContents.get(".dockerignore");
  if (dockerignore) {
    ig.add(dockerignore);
  }

  return (relativePath: string) => {
    // Remove leading folder name (e.g., "my-project/src/app.ts" → "src/app.ts")
    // But only if not already a bare path
    try {
      return !ig.ignores(relativePath);
    } catch {
      return true; // If filter errors, include the file
    }
  };
}

/**
 * POST /api/apps/import/upload
 *
 * Upload project folder files for import.
 * Files are filtered using .gitignore/.dockerignore patterns,
 * stored in MinIO, and processed via background pipeline.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 3 import uploads per minute
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`import-upload:${ip}`, 3, 60 * 1000);
  if (rl.limited) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)),
        },
      }
    );
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];
  const paths = formData.getAll("paths") as string[];

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Too many files (max ${MAX_FILES})` },
      { status: 400 }
    );
  }

  // Step 1: Extract ignore file contents for filtering
  const ignoreContents = new Map<string, string>();
  for (let i = 0; i < files.length; i++) {
    const relativePath = paths[i] || files[i].name;
    const baseName = relativePath.split("/").pop() || "";
    if (baseName === ".gitignore" || baseName === ".dockerignore") {
      try {
        const text = await files[i].text();
        ignoreContents.set(baseName, text);
      } catch {
        // Skip unreadable ignore files
      }
    }
  }

  // Step 2: Build filter and apply
  const shouldInclude = buildIgnoreFilter(files, paths, ignoreContents);

  const orgSlug = await getOrgSlug(session.user.id);
  const importSessionId = randomUUID();

  // Step 3: Create ImportSession record
  await prisma.importSession.create({
    data: {
      userId: session.user.id,
      organizationId: session.user.organizationId,
      importSessionId,
      status: "uploading",
      fileCount: 0,
    },
  });

  let storedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relativePath = paths[i] || file.name;

    if (file.size > MAX_FILE_SIZE) {
      skippedCount++;
      continue;
    }

    if (file.size === 0) {
      skippedCount++;
      continue;
    }

    // Apply ignore filter
    if (!shouldInclude(relativePath)) {
      skippedCount++;
      continue;
    }

    const fileType = detectFileType(file.type, file.name);

    const chatFile = await prisma.chatFile.create({
      data: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        fileName: file.name,
        fileType,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        storagePath: "",
        status: "uploaded",
        importSessionId,
        relativePath,
      },
    });

    // Store in MinIO
    const minioKey = buildImportFileKey(orgSlug, importSessionId, chatFile.id, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFileToMinIO(minioKey, buffer);

    await prisma.chatFile.update({
      where: { id: chatFile.id },
      data: { storagePath: minioKey },
    });

    // Trigger background processing pipeline
    try {
      const { ensureBackgroundSystem } = await import(
        "@/lib/actors/background-system"
      );
      const backgroundSystem = await ensureBackgroundSystem();

      backgroundSystem.fireAndForget("file_processor", "process_file", {
        fileId: chatFile.id,
        storagePath: minioKey,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
        conversationId: importSessionId,
      });

      backgroundSystem.fireAndForget("file_analyzer", "analyze_file", {
        fileId: chatFile.id,
        storagePath: minioKey,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
      });
    } catch (err) {
      console.warn("[import/upload] Background agent dispatch failed:", err);
    }

    storedCount++;
  }

  // Update session with file count and advance status
  await prisma.importSession.update({
    where: { importSessionId },
    data: {
      fileCount: storedCount,
      status: "processing",
    },
  });

  return NextResponse.json({
    importSessionId,
    fileCount: storedCount,
    skippedCount,
  });
}
