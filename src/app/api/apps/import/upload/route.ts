import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, getOrgSlug } from "@/lib/db";
import { writeFileToStorage, buildChatFileStoragePath } from "@/lib/file-storage";
import { randomUUID } from "node:crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/** Max size for a single file (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** Max total files per import session */
const MAX_FILES = 500;

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
 * Ensure file processing background agents are registered.
 */
async function ensureFileAgents() {
  const { ensureBackgroundSystem, backgroundSystem } = await import(
    "@/lib/actors/background-system"
  );
  await ensureBackgroundSystem();

  if (!backgroundSystem.hasActor("file_processor")) {
    const { FileProcessorActor } = await import(
      "@/lib/actors/file-processor-actor"
    );
    await backgroundSystem.registerActor(
      new FileProcessorActor(`file-processor-${Date.now()}`)
    );
  }

  if (!backgroundSystem.hasActor("file_analyzer")) {
    const { FileAnalyzerActor } = await import(
      "@/lib/actors/file-analyzer-actor"
    );
    await backgroundSystem.registerActor(
      new FileAnalyzerActor(`file-analyzer-${Date.now()}`)
    );
  }

  return backgroundSystem;
}

/**
 * POST /api/apps/import/upload
 *
 * Upload project folder files for import.
 * Files are stored and processed via background pipeline (FileProcessor -> FileAnalyzer -> Embedding).
 *
 * FormData fields:
 * - files: File[] — the files to upload
 * - paths: string[] — corresponding relative paths (e.g., "src/app/page.tsx")
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

  const orgSlug = await getOrgSlug(session.user.id);
  const importSessionId = randomUUID();

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

    const storagePath = buildChatFileStoragePath(
      orgSlug,
      chatFile.id,
      file.name
    );
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFileToStorage(storagePath, buffer);

    await prisma.chatFile.update({
      where: { id: chatFile.id },
      data: { storagePath },
    });

    // Trigger background processing pipeline
    try {
      const backgroundSystem = await ensureFileAgents();

      backgroundSystem.fireAndForget("file_processor", "process_file", {
        fileId: chatFile.id,
        storagePath,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
        conversationId: importSessionId,
      });

      backgroundSystem.fireAndForget("file_analyzer", "analyze_file", {
        fileId: chatFile.id,
        storagePath,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
      });
    } catch (err) {
      console.warn("[import/upload] Background agent dispatch failed:", err);
    }

    storedCount++;
  }

  return NextResponse.json({
    importSessionId,
    fileCount: storedCount,
    skippedCount,
  });
}
