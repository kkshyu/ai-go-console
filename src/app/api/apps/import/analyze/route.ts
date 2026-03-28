import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chat, getModelForAgent } from "@/lib/ai";
import { generateEmbedding } from "@/lib/embeddings";
import { searchSimilarChunks, assembleContext } from "@/lib/vector-search";
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
4. 最適合的範本類型
5. 需要的外部服務

## 範本選擇邏輯
- package.json 有 next 依賴 → "nextjs-fullstack"
- package.json 有 react 但沒有 next → "react-spa"
- package.json 有 express / fastify / koa → "node-api"
- 有 @line/bot-sdk 或 LINE 相關設定 → "line-bot"
- 其他情況 → "nextjs-fullstack"

## 服務偵測邏輯
- 有 prisma/schema.prisma 或 pg/mysql/mongodb 依賴 → 對應的資料庫服務
- 有 stripe/paypal 依賴 → 對應的金流服務
- 有 auth0/firebase-auth 依賴 → 對應的認證服務
- 有 aws-sdk/s3 依賴 → "s3"
- 有 .env 中的 LINE_CHANNEL → "line_bot"
- 有 sendgrid/ses/mailgun 依賴 → 對應的郵件服務

可用的服務代碼：postgresql, mysql, mongodb, s3, gcs, azure_blob, stripe, paypal, ecpay, sendgrid, ses, mailgun, twilio, vonage, aws_sns, auth0, firebase_auth, line_login, supabase, hasura, line_bot, whatsapp, discord, telegram, openai, gemini, claude, openrouter

## 輸出格式
只輸出以下 JSON，不要有其他文字：
\`\`\`json
{
  "name": "應用名稱",
  "slug": "english-kebab-case-slug",
  "description": "簡短描述",
  "template": "nextjs-fullstack",
  "requiredServices": ["postgresql"]
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
    if (!parsed.name || !parsed.template) return null;
    return {
      name: parsed.name || "",
      slug: parsed.slug || "",
      description: parsed.description || "",
      template: parsed.template || "nextjs-fullstack",
      requiredServices: Array.isArray(parsed.requiredServices)
        ? parsed.requiredServices
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * POST /api/apps/import/analyze
 *
 * RAG-based project analysis. Instead of stuffing all file contents into one prompt,
 * this endpoint:
 * 1. Fetches priority files (package.json, etc.) directly from ChatFile.extractedText
 * 2. Uses vector search to find relevant chunks across all uploaded files
 * 3. Assembles a focused context and calls the LLM
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

  // 2. RAG search for additional context
  let ragContext = "";
  try {
    const queryEmbedding = await generateEmbedding(
      "What is this project? What framework, dependencies, template, and services does it use? Detect package.json, configuration files, database schemas, API integrations."
    );

    if (queryEmbedding.length > 0) {
      const results = await searchSimilarChunks(importSessionId, queryEmbedding, {
        limit: 30,
        minSimilarity: 0.2,
      });
      ragContext = assembleContext(results, 12000);
    }
  } catch (err) {
    console.warn("[import/analyze] RAG search failed, proceeding with priority files only:", err);
  }

  // 3. Assemble prompt
  const parts: string[] = [];
  parts.push(`Project contains ${allFiles.length} files.\n`);
  parts.push(`File tree:\n${fileTree}\n`);

  if (priorityContents.length > 0) {
    parts.push(`\nKey configuration files:\n${priorityContents.join("\n\n")}`);
  }

  if (ragContext) {
    parts.push(`\nAdditional context from project files:${ragContext}`);
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

  try {
    const model = getModelForAgent("architect");
    const result = await chat(
      [
        {
          role: "user",
          content: `分析以下專案資料夾，判斷應用類型和需要的服務：\n\n${filePrompt}`,
        },
      ],
      model,
      undefined,
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
