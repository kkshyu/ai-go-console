import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readFileFromStorage } from "@/lib/file-storage";

/**
 * GET /api/apps/import/files?sessionId=X
 *
 * Retrieve all uploaded files for an import session as { path, content } pairs.
 * Used by the frontend to pass files into POST /api/apps for app generation.
 *
 * Also extracts npm dependencies from the uploaded package.json.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 }
    );
  }

  // Fetch all files for this import session (only code/text types that have content)
  const chatFiles = await prisma.chatFile.findMany({
    where: {
      importSessionId: sessionId,
      userId: session.user.id,
      status: "ready",
    },
    select: {
      id: true,
      fileName: true,
      relativePath: true,
      fileType: true,
      extractedText: true,
      storagePath: true,
    },
  });

  if (chatFiles.length === 0) {
    return NextResponse.json(
      { error: "No files found for this import session" },
      { status: 404 }
    );
  }

  const files: Array<{ path: string; content: string }> = [];
  let npmPackages: string[] = [];

  for (const cf of chatFiles) {
    const relativePath = cf.relativePath || cf.fileName;

    // Skip non-text file types (images, pdfs, etc.)
    if (cf.fileType !== "code" && cf.fileType !== "text") continue;

    let content = cf.extractedText || "";

    // If extractedText is empty but we have a storage path, try reading from storage
    if (!content && cf.storagePath) {
      try {
        const buffer = await readFileFromStorage(cf.storagePath);
        content = buffer.toString("utf-8");
      } catch {
        // Skip files that can't be read
        continue;
      }
    }

    if (!content) continue;

    files.push({ path: relativePath, content });

    // Extract npm dependencies from package.json
    if (relativePath === "package.json" || relativePath.endsWith("/package.json")) {
      // Only extract from root package.json
      if (relativePath === "package.json") {
        try {
          const pkg = JSON.parse(content);
          const deps = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
          };
          npmPackages = Object.keys(deps).filter(
            // Exclude framework packages that are already in the template base image
            (name) => !isTemplateCoreDependency(name)
          );
        } catch {
          // Invalid JSON — skip
        }
      }
    }
  }

  return NextResponse.json({ files, npmPackages });
}

/**
 * Dependencies that are already included in template base images.
 * These should not be passed as extra npmPackages since they'll conflict.
 */
function isTemplateCoreDependency(name: string): boolean {
  const corePackages = new Set([
    "next",
    "react",
    "react-dom",
    "typescript",
    "@types/node",
    "@types/react",
    "@types/react-dom",
    "tailwindcss",
    "@tailwindcss/postcss",
    "postcss",
    "autoprefixer",
    "eslint",
    "eslint-config-next",
    "express",
    "@line/bot-sdk",
    "tsx",
    "vite",
    "@vitejs/plugin-react",
  ]);
  return corePackages.has(name);
}
