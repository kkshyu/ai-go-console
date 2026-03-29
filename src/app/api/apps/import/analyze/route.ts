import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chat, getModelForAgent } from "@/lib/ai";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/** Max content size for priority files in the prompt (3KB each) */
const MAX_PRIORITY_CONTENT = 3 * 1024;

/** Priority files to fetch directly from extractedText */
const PRIORITY_FILES = [
  "package.json",
  "tsconfig.json",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "vite.config.ts",
  "vite.config.js",
  "prisma/schema.prisma",
  ".env.example",
  ".env.sample",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Dockerfile",
  "README.md",
];

const ANALYSIS_SYSTEM_PROMPT = `你是一個程式碼分析助手。根據使用者上傳的專案資料夾內容，分析並判斷：
1. 適當的應用名稱（使用使用者程式碼中的語言，或英文）
2. slug（英文小寫，用 - 連接，語意化描述應用）
3. 簡短描述（一句話說明應用用途）

## 輸出格式
只輸出以下 JSON，不要有其他文字：
\`\`\`json
{
  "name": "應用名稱",
  "slug": "english-kebab-case-slug",
  "description": "簡短描述"
}
\`\`\``;

function parseAnalysisResponse(content: string): {
  name: string;
  slug: string;
  description: string;
  template: string;
  requiredServices: string[];
} | null {
  const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : content;

  try {
    const parsed = JSON.parse(jsonStr.trim());
    if (!parsed.name) return null;
    return {
      name: parsed.name || "",
      slug: parsed.slug || "",
      description: parsed.description || "",
      template: "blank",
      requiredServices: [],
    };
  } catch {
    return null;
  }
}

/**
 * POST /api/apps/import/analyze
 *
 * RAG-based project analysis. Detects name, slug, and description only.
 * Always uses blank template with no service bindings.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request.headers);
  const rl = rateLimit(`import-analyze:${ip}`, 5, 60 * 1000);
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

  const body = await request.json();
  const { importSessionId } = body as { importSessionId?: string };

  if (!importSessionId) {
    return NextResponse.json(
      { error: "importSessionId is required" },
      { status: 400 }
    );
  }

  // Load all files for this session
  const allFiles = await prisma.chatFile.findMany({
    where: {
      importSessionId,
      userId: session.user.id,
    },
    select: {
      id: true,
      fileName: true,
      relativePath: true,
      extractedText: true,
      summary: true,
      status: true,
    },
  });

  if (allFiles.length === 0) {
    return NextResponse.json(
      { error: "No files found for this import session" },
      { status: 404 }
    );
  }

  // Build file tree listing
  const fileTree = allFiles
    .map((f) => f.relativePath || f.fileName)
    .sort()
    .join("\n");

  // 1. Direct-fetch priority files
  const priorityContents: string[] = [];
  const prioritySet = new Set(PRIORITY_FILES);

  for (const file of allFiles) {
    const filePath = file.relativePath || file.fileName;
    const baseName = filePath.split("/").pop() || "";

    if (
      (prioritySet.has(filePath) || prioritySet.has(baseName)) &&
      file.extractedText
    ) {
      const content =
        file.extractedText.length > MAX_PRIORITY_CONTENT
          ? file.extractedText.slice(0, MAX_PRIORITY_CONTENT) + "\n... (truncated)"
          : file.extractedText;
      priorityContents.push(`--- ${filePath} ---\n${content}`);
    }
  }

  // 2. Assemble prompt
  const parts: string[] = [];
  parts.push(`Project contains ${allFiles.length} files.\n`);
  parts.push(`File tree:\n${fileTree}\n`);

  if (priorityContents.length > 0) {
    parts.push(`\nKey configuration files:\n${priorityContents.join("\n\n")}`);
  }

  // Include summaries of non-priority files for broader understanding
  const summaries = allFiles
    .filter((f) => f.summary && f.summary.length > 0)
    .map((f) => `- ${f.relativePath || f.fileName}: ${f.summary}`)
    .slice(0, 50);

  if (summaries.length > 0) {
    parts.push(`\nFile summaries:\n${summaries.join("\n")}`);
  }

  const filePrompt = parts.join("\n");

  // Update ImportSession status
  try {
    await prisma.importSession.update({
      where: { importSessionId },
      data: { status: "analyzing" },
    });
  } catch {
    // ImportSession might not exist in some edge cases
  }

  try {
    const model = getModelForAgent("architect");
    const result = await chat(
      [
        {
          role: "user",
          content: `分析以下專案資料夾，判斷應用名稱、slug 和描述：\n\n${filePrompt}`,
        },
      ],
      model,
      ANALYSIS_SYSTEM_PROMPT
    );

    const analysis = parseAnalysisResponse(result.content);
    if (!analysis) {
      return NextResponse.json(
        { error: "Failed to parse analysis result" },
        { status: 500 }
      );
    }

    return NextResponse.json(analysis);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
