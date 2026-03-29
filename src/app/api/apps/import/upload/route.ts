import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, getOrgSlug } from "@/lib/db";
import { writeFileToMinIO, buildImportFileKey } from "@/lib/minio-storage";
import { randomUUID } from "node:crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import ignore from "ignore";
import AdmZip from "adm-zip";

/** Max size for a single file (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** Max size for a zip file (100MB) */
const MAX_ZIP_SIZE = 100 * 1024 * 1024;
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
    /\.(ts|tsx|js|jsx|py|go|rs|java|kt|swift|rb|php|c|cpp|h|hpp|vue|svelte|sql|sh|yaml|yml|toml|ini|cfg|conf|env|log|csv|md|prisma|graphql|html|htm|css|scss|sass|less|xml|json5|jsonc|pug|ejs|hbs|mustache)$/i.test(
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
 * Extract files from a zip archive, returning them as an array of
 * { buffer, relativePath, mimeType } objects.
 * Strips the common root folder prefix if all entries share one.
 */
function extractZipFiles(
  zipBuffer: Buffer
): Array<{ buffer: Buffer; relativePath: string; fileName: string }> {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  const result: Array<{
    buffer: Buffer;
    relativePath: string;
    fileName: string;
  }> = [];

  // Determine common root prefix (e.g., "my-project/")
  const allPaths = entries
    .filter((e) => !e.isDirectory)
    .map((e) => e.entryName);
  let commonPrefix = "";
  if (allPaths.length > 0) {
    const firstParts = allPaths[0].split("/");
    if (firstParts.length > 1) {
      const candidate = firstParts[0] + "/";
      if (allPaths.every((p) => p.startsWith(candidate))) {
        commonPrefix = candidate;
      }
    }
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const entryData = entry.getData();
    if (!entryData || entryData.length === 0) continue;
    if (entryData.length > MAX_FILE_SIZE) continue;

    let relativePath = entry.entryName;
    if (commonPrefix && relativePath.startsWith(commonPrefix)) {
      relativePath = relativePath.slice(commonPrefix.length);
    }
    if (!relativePath) continue;

    // Skip macOS resource fork files
    if (relativePath.startsWith("__MACOSX/") || relativePath.includes("/__MACOSX/")) continue;

    const fileName = relativePath.split("/").pop() || relativePath;
    result.push({ buffer: entryData, relativePath, fileName });
  }

  return result;
}

/**
 * POST /api/apps/import/upload
 *
 * Upload project folder files or a zip archive for import.
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

  // Check if single zip file upload
  const isZipUpload =
    files.length === 1 &&
    (files[0].name.toLowerCase().endsWith(".zip") ||
      files[0].type === "application/zip" ||
      files[0].type === "application/x-zip-compressed");

  // If zip, extract and convert to the same format as folder uploads
  let processFiles: File[];
  let processPaths: string[];

  if (isZipUpload) {
    const zipFile = files[0];
    if (zipFile.size > MAX_ZIP_SIZE) {
      return NextResponse.json(
        { error: `Zip file too large (max ${MAX_ZIP_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }

    const zipBuffer = Buffer.from(await zipFile.arrayBuffer());
    let extracted: Array<{
      buffer: Buffer;
      relativePath: string;
      fileName: string;
    }>;
    try {
      extracted = extractZipFiles(zipBuffer);
    } catch {
      return NextResponse.json(
        { error: "Failed to extract zip file. Please ensure it is a valid zip archive." },
        { status: 400 }
      );
    }

    if (extracted.length === 0) {
      return NextResponse.json(
        { error: "Zip file contains no valid files" },
        { status: 400 }
      );
    }

    if (extracted.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many files in zip (max ${MAX_FILES})` },
        { status: 400 }
      );
    }

    // Convert extracted entries to File objects for uniform processing
    processFiles = extracted.map(
      (e) => new File([e.buffer], e.fileName, { type: "application/octet-stream" })
    );
    processPaths = extracted.map((e) => e.relativePath);
  } else {
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many files (max ${MAX_FILES})` },
        { status: 400 }
      );
    }
    processFiles = files;
    processPaths = paths;
  }

  // Step 1: Extract ignore file contents for filtering
  const ignoreContents = new Map<string, string>();
  for (let i = 0; i < processFiles.length; i++) {
    const relativePath = processPaths[i] || processFiles[i].name;
    const baseName = relativePath.split("/").pop() || "";
    if (baseName === ".gitignore" || baseName === ".dockerignore") {
      try {
        const text = await processFiles[i].text();
        ignoreContents.set(baseName, text);
      } catch {
        // Skip unreadable ignore files
      }
    }
  }

  // Step 2: Build filter and apply
  const shouldInclude = buildIgnoreFilter(processFiles, processPaths, ignoreContents);

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

  for (let i = 0; i < processFiles.length; i++) {
    const file = processFiles[i];
    const relativePath = processPaths[i] || file.name;

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
