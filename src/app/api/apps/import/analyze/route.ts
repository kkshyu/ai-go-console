import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { chat, getModelForAgent } from "@/lib/ai";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/** Max number of files to accept */
const MAX_FILES = 200;
/** Max total content size in bytes (500KB) */
const MAX_TOTAL_SIZE = 500 * 1024;
/** Max individual file content size for the prompt (5KB) */
const MAX_FILE_CONTENT = 5 * 1024;

/** Priority files to include first in the prompt (order matters) */
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

interface FileItem {
  path: string;
  content: string;
}

function buildFilePrompt(files: FileItem[]): string {
  // Sort: priority files first, then by path
  const priorityMap = new Map(PRIORITY_FILES.map((f, i) => [f, i]));
  const sorted = [...files].sort((a, b) => {
    const aIdx = priorityMap.get(a.path) ?? priorityMap.get(a.path.split("/").pop()!) ?? 999;
    const bIdx = priorityMap.get(b.path) ?? priorityMap.get(b.path.split("/").pop()!) ?? 999;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.path.localeCompare(b.path);
  });

  let totalSize = 0;
  const parts: string[] = [];
  parts.push(`Project contains ${files.length} files. Key files:\n`);

  for (const file of sorted) {
    const content =
      file.content.length > MAX_FILE_CONTENT
        ? file.content.slice(0, MAX_FILE_CONTENT) + "\n... (truncated)"
        : file.content;

    const entry = `--- ${file.path} ---\n${content}\n`;
    if (totalSize + entry.length > MAX_TOTAL_SIZE) {
      // Just list remaining files without content
      const remaining = sorted.slice(sorted.indexOf(file));
      parts.push(`\n--- Other files (${remaining.length} files, content omitted) ---`);
      parts.push(remaining.map((f) => f.path).join("\n"));
      break;
    }
    totalSize += entry.length;
    parts.push(entry);
  }

  return parts.join("\n");
}

function parseAnalysisResponse(content: string): {
  name: string;
  slug: string;
  description: string;
  template: string;
  requiredServices: string[];
} | null {
  // Try to extract JSON from code block
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

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 5 analyze requests per user per minute
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`import-analyze:${ip}`, 5, 60 * 1000);
  if (rl.limited) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      }
    );
  }

  const body = await request.json();
  const { files } = body as { files?: FileItem[] };

  if (!files || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json(
      { error: "No files provided" },
      { status: 400 }
    );
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Too many files (max ${MAX_FILES})` },
      { status: 400 }
    );
  }

  // Build the file prompt for LLM analysis
  const filePrompt = buildFilePrompt(files);

  try {
    const model = getModelForAgent("architect");
    const result = await chat(
      [{ role: "user", content: `分析以下專案資料夾，判斷應用類型和需要的服務：\n\n${filePrompt}` }],
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
