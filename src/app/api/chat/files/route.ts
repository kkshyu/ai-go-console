import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, getOrgSlug } from "@/lib/db";
import { writeFileToStorage, buildChatFileStoragePath } from "@/lib/file-storage";

/**
 * Ensure file processing background agents are registered.
 * These are registered lazily (server-only) to avoid client bundle issues.
 */
async function ensureFileAgents() {
  const { ensureBackgroundSystem, backgroundSystem } = await import("@/lib/actors/background-system");
  await ensureBackgroundSystem();

  if (!backgroundSystem.hasActor("file_processor")) {
    const { FileProcessorActor } = await import("@/lib/actors/file-processor-actor");
    await backgroundSystem.registerActor(new FileProcessorActor(`file-processor-${Date.now()}`));
  }

  if (!backgroundSystem.hasActor("file_analyzer")) {
    const { FileAnalyzerActor } = await import("@/lib/actors/file-analyzer-actor");
    await backgroundSystem.registerActor(new FileAnalyzerActor(`file-analyzer-${Date.now()}`));
  }

  return backgroundSystem;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

function detectFileType(mimeType: string, fileName: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/javascript" ||
    mimeType === "application/typescript" ||
    /\.(ts|tsx|js|jsx|py|go|rs|java|kt|swift|rb|php|c|cpp|h|hpp|vue|svelte|sql|sh|yaml|yml|toml|ini|cfg|conf|env|log|csv|md|prisma|graphql)$/i.test(fileName)
  ) {
    return "code";
  }
  return "unknown";
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];
  const pipelineId = formData.get("pipelineId") as string | null;

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Maximum ${MAX_FILES} files allowed` }, { status: 400 });
  }

  const orgSlug = await getOrgSlug(session.user.id);
  const results = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      results.push({
        name: file.name,
        error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      });
      continue;
    }

    const fileType = detectFileType(file.type, file.name);

    // Create DB record first to get ID
    const chatFile = await prisma.chatFile.create({
      data: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        fileName: file.name,
        fileType,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        storagePath: "", // will update after storage
        status: "uploaded",
        pipelineId: pipelineId || null,
      },
    });

    // Build storage path and save file
    const storagePath = buildChatFileStoragePath(orgSlug, chatFile.id, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFileToStorage(storagePath, buffer);

    // Update storage path
    await prisma.chatFile.update({
      where: { id: chatFile.id },
      data: { storagePath },
    });

    // Trigger background agents (fire-and-forget)
    try {
      const backgroundSystem = await ensureFileAgents();

      backgroundSystem.fireAndForget("file_processor", "process_file", {
        fileId: chatFile.id,
        storagePath,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
        pipelineId: pipelineId || undefined,
      });

      backgroundSystem.fireAndForget("file_analyzer", "analyze_file", {
        fileId: chatFile.id,
        storagePath,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
      });
    } catch (err) {
      console.warn("[chat/files] Background agent dispatch failed:", err);
    }

    // Generate preview for images (small base64 thumbnail)
    let preview: string | undefined;
    if (fileType === "image" && file.size < 500 * 1024) {
      // For small images, include inline base64 preview
      preview = `data:${file.type};base64,${buffer.toString("base64")}`;
    }

    results.push({
      id: chatFile.id,
      name: file.name,
      type: fileType,
      sizeBytes: file.size,
      status: "uploaded",
      preview,
    });
  }

  return NextResponse.json({ files: results });
}

/**
 * GET /api/chat/files?ids=id1,id2 — Get file status and metadata
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ids = request.nextUrl.searchParams.get("ids")?.split(",").filter(Boolean) || [];
  if (!ids.length) {
    return NextResponse.json({ error: "No file IDs provided" }, { status: 400 });
  }

  const files = await prisma.chatFile.findMany({
    where: {
      id: { in: ids },
      userId: session.user.id,
    },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
      summary: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ files });
}
