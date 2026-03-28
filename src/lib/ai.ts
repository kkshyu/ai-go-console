const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessageContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };

export type ChatMessageContent = string | ChatMessageContentPart[];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: ChatMessageContent;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StreamChatResult {
  content: string;
  usage: TokenUsage | null;
}

export const AVAILABLE_MODELS = [
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
  { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "google/gemini-2.5-flash-preview", label: "Gemini 2.5 Flash" },
] as const;

export const DEFAULT_MODEL = AVAILABLE_MODELS[0].id;

export function buildSystemPrompt(allowedServices?: string[]): string {
  const serviceList = allowedServices && allowedServices.length > 0
    ? allowedServices.join(", ")
    : "postgresql, mysql, mongodb, s3, gcs, azure_blob, stripe, paypal, ecpay, sendgrid, ses, mailgun, twilio, vonage, aws_sns, auth0, firebase_auth, line_login, supabase, hasura, line_bot, whatsapp, discord, telegram";

  return `你是 AI Go，一位友善的應用程式建立助手。你的任務是幫助使用者快速建立他們需要的應用程式。

## 對話風格

- **絕對不要使用任何技術名詞**：不要提到 template 名稱（如 react-spa、nextjs-fullstack）、服務代碼（如 postgresql、stripe）、或任何程式相關術語
- **主動猜想使用者需求**：根據使用者的描述，直接提出你猜想的應用內容，讓使用者確認或修正。例如：「聽起來你想要一個可以記錄客戶資料、追蹤拜訪紀錄的工具，對嗎？」
- **每次回覆最多問 2 個問題**：如果有多個需要釐清的點，挑最重要的 2 個問就好
- **用生活化的語言**：說「需要儲存資料」而不是「需要資料庫」，說「收款功能」而不是「金流串接」，說「發通知」而不是「推播服務」
- **回覆要簡短**：不要長篇大論，幾句話就好
- **使用與使用者相同的語言回覆**

## 建立應用的流程

1. 使用者描述需求後，**立即猜想**他們想做什麼，提出具體的功能清單讓他們確認
2. 幫應用取一個適當的名稱（使用使用者的語言），如果使用者沒指定的話
3. 確認使用者同意後，輸出 JSON action block 來建立應用

## JSON Action 格式

當你準備好建立應用時，輸出以下格式的 JSON：
\`\`\`json
{
  "action": "create_app",
  "name": "應用名稱",
  "slug": "english-semantic-slug",
  "template": "nextjs-fullstack",
  "description": "簡短描述",
  "config": {},
  "requiredServices": ["postgresql"]
}
\`\`\`

### slug 規則
- 必須是英文小寫，用 \`-\` 連接
- 必須語意化地描述應用名稱（不是拼音，是英文翻譯）
- 例如：name "客戶管理系統" → slug "customer-management-system"
- 例如：name "報價產生器" → slug "quote-generator"
- 例如：name "請假系統" → slug "leave-management"

### template 選擇邏輯（不要告訴使用者）
- 如果是 LINE Bot 相關應用 → "line-bot"
- 如果只需要前端介面（儀表板、展示頁面）→ "react-spa"
- 如果只需要後端 API → "node-api"
- 其他情況一律用 → "nextjs-fullstack"

### 可用的服務類型（不要告訴使用者技術名稱，但在 JSON 中使用正確的代碼）
僅限以下組織已啟用的服務：${serviceList}

服務對應表（左邊是功能描述，右邊是 JSON 中要用的代碼）：
- 儲存資料 → "postgresql" / "mysql" / "mongodb"
- 檔案儲存 → "s3" / "gcs" / "azure_blob"
- 收款/付款 → "stripe" / "paypal" / "ecpay"
- 寄信/發信 → "sendgrid" / "ses" / "mailgun"
- 發簡訊 → "twilio" / "vonage" / "aws_sns"
- 會員登入 → "auth0" / "firebase_auth" / "line_login"
- 全方位平台 → "supabase" / "hasura"
- LINE 聊天機器人 → "line_bot"
- 通訊軟體 → "whatsapp" / "discord" / "telegram"

## PRD 摘要

每次回覆時，在回覆末尾附上以下格式的需求摘要，用來整理目前已確認的需求。這個摘要會顯示在畫面右側，幫助使用者即時確認需求。

\`\`\`prd
{
  "appName": "應用名稱（如果還沒確定就留空字串）",
  "description": "一句話描述這個應用的用途",
  "targetUsers": "誰會使用這個應用",
  "features": ["功能一", "功能二"],
  "dataNeeds": ["需要記錄的資料一", "資料二"],
  "integrations": ["收款", "發通知"],
  "requiredServices": ["postgresql", "stripe"]
}
\`\`\`

PRD 摘要注意事項：
- appName / description / targetUsers / features / dataNeeds / integrations 全部用使用者看得懂的語言，不要技術名詞
- requiredServices 使用正確的服務代碼（這個欄位不會顯示給使用者，所以用代碼沒關係）
- 隨著對話推進，持續更新這個摘要
- 還沒確認的欄位可以留空陣列或空字串
- 使用與使用者相同的語言

## 重要提醒
- 只使用組織已啟用的服務
- 確認使用者同意後才輸出 JSON
- 對話中絕對不要暴露任何技術名詞或代碼`;
}

export interface AppContext {
  name: string;
  template: string;
  description?: string | null;
  status: string;
  port?: number | null;
  services?: Array<{ name: string; type: string }>;
}

export function buildAppContextPrompt(
  app: AppContext,
  allowedServices?: string[],
  fileContext?: string
): string {
  const serviceList =
    allowedServices && allowedServices.length > 0
      ? allowedServices.join(", ")
      : "disk, postgresql, supabase, stripe, hasura";

  const connectedServices =
    app.services && app.services.length > 0
      ? app.services.map((s) => `${s.name} (${s.type})`).join(", ")
      : "None";

  const fileSection = fileContext
    ? `\n\nCurrent app files:\n${fileContext}`
    : "";

  return `You are AI Go, an intelligent assistant that helps users develop and improve their web applications.

You are working on an existing app with these details:
- Name: ${app.name}
- Template: ${app.template}
- Description: ${app.description || "No description"}
- Status: ${app.status}
- Port: ${app.port || "Not assigned"}
- Connected services: ${connectedServices}

Available templates:
- "react-spa": Single-page React application with Vite and TypeScript.
- "node-api": Express.js REST API with TypeScript.
- "nextjs-fullstack": Full-stack Next.js application with App Router and Tailwind.

Available service types for this organization: ${serviceList}
${fileSection}

When the user wants to update the app configuration, add services, or change settings, respond with a JSON block:
\`\`\`json
{
  "action": "update_app",
  "changes": {
    "description": "updated description",
    "addServices": ["postgresql"],
    "config": {}
  }
}
\`\`\`

Guidelines:
1. Help the user develop, debug, and improve their existing app
2. Suggest code changes, architecture improvements, or service additions
3. When changes need to be applied to the app, output the JSON action block
4. Only suggest service types available for the organization
5. Be specific about file changes and provide code examples when relevant

Be concise and helpful. Respond in the same language as the user.`;
}

/**
 * Stream chat completion from OpenRouter
 */
/** Default timeout for streaming LLM calls (90 seconds). */
const STREAM_TIMEOUT_MS = 90_000;

export async function streamChat(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  model: string = DEFAULT_MODEL,
  allowedServices?: string[],
  systemPromptOverride?: string,
  abortSignal?: AbortSignal,
): Promise<StreamChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const systemPrompt = systemPromptOverride || buildSystemPrompt(allowedServices);

  // Create a timeout-based abort if no external signal provided
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), STREAM_TIMEOUT_MS);

  // Combine external signal with timeout
  const signal = abortSignal
    ? anySignal([abortSignal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": "AI Go Console",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        max_tokens: 4096,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullContent = "";
    let usage: TokenUsage | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Reset timeout on each chunk received
      clearTimeout(timeoutId);

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            onChunk(content);
          }
          // Capture usage from the final chunk
          if (parsed.usage) {
            usage = {
              promptTokens: parsed.usage.prompt_tokens ?? 0,
              completionTokens: parsed.usage.completion_tokens ?? 0,
              totalTokens: parsed.usage.total_tokens ?? 0,
            };
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }

    return { content: fullContent, usage };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Combine multiple AbortSignals — aborts when any one fires.
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort(sig.reason);
      return controller.signal;
    }
    sig.addEventListener("abort", () => controller.abort(sig.reason), { once: true });
  }
  return controller.signal;
}

/**
 * Non-streaming chat completion
 */
/** Model used for translating agent output into user-friendly messages */
export const OUTPUT_MODEL = "anthropic/claude-haiku-4.5";

/**
 * Strip JSON code blocks from content
 */
export function stripJsonBlocks(content: string): string {
  return content.replace(/```json\s*\n[\s\S]*?\n```/g, "").trim();
}

/**
 * Locale-to-language name mapping for translation output.
 */
const LOCALE_LANGUAGE_MAP: Record<string, string> = {
  "zh-TW": "繁體中文",
  "en": "English",
};

/**
 * Build the translation system prompt for a given language.
 */
function buildTranslationSystemPrompt(languageName: string): string {
  return `You are a UX writer for AI Go, an app-building platform. Your job is to rewrite internal agent output into clear, friendly messages for end users.

Rules:
- ALWAYS respond in ${languageName}, regardless of the input language
- Never include raw JSON, code blocks, technical jargon, or internal action names in your output
- Be concise — one short paragraph or a few bullet points max
- Use a warm, professional tone
- Summarize what the agent decided or accomplished, based on the JSON data
- If the agent is dispatching work, briefly describe what's being done next
- If the agent designed architecture, summarize the technology choices
- If the agent created an app, summarize the app name, features, and services
- Do not mention other agents, pipeline stages, or internal system details
- Do NOT comment on the format, completeness, or structure of the input — just summarize the content
- ALWAYS produce output — never say you didn't receive content`;
}

/**
 * Build the user message for translation based on locale.
 */
function buildTranslationUserMessage(agentRole: string, content: string, locale: string): string {
  if (locale === "en") {
    return `Rewrite the following ${agentRole} agent output as a user-friendly English message:\n\n${content}`;
  }
  return `將以下 ${agentRole} 代理的輸出改寫為使用者友善的繁體中文訊息：\n\n${content}`;
}

/**
 * Truncate long content for translation, trying to preserve JSON block boundaries.
 */
function truncateForTranslation(content: string, maxLength: number = 2000): string {
  if (content.length <= maxLength) return content;

  // Find the last complete JSON block within a slightly extended range
  const searchRange = content.slice(0, maxLength + 500);
  const lastJsonEnd = searchRange.lastIndexOf("```");
  if (lastJsonEnd > 500) {
    return content.slice(0, lastJsonEnd + 3);
  }
  return content.slice(0, maxLength) + "\n...（內容已省略）";
}

/**
 * Direct translation of content (single LLM call, no chunking).
 * Exported for use by SummarizerActor.
 */
export async function translateDirect(
  content: string,
  agentRole: string,
  locale: string = "zh-TW",
): Promise<StreamChatResult> {
  const languageName = LOCALE_LANGUAGE_MAP[locale] || "繁體中文";
  const truncated = truncateForTranslation(content);
  const systemPrompt = buildTranslationSystemPrompt(languageName);
  const userMessage = buildTranslationUserMessage(agentRole, truncated, locale);

  try {
    return await chat(
      [{ role: "user", content: userMessage }],
      OUTPUT_MODEL,
      undefined,
      systemPrompt,
    );
  } catch {
    const fallback = stripJsonBlocks(content);
    return { content: fallback || "", usage: null };
  }
}

/**
 * Translate raw agent output into a user-friendly message.
 * Uses a fast/cheap model to rewrite technical agent output
 * as clear, conversational text for end users.
 *
 * For short content (<=2000 chars), translates directly.
 * For long content, delegates to the background SummarizerActor
 * for map-reduce processing.
 */
export async function translateForUser(
  rawContent: string,
  agentRole: string,
  locale: string = "zh-TW",
): Promise<StreamChatResult> {
  const trimmed = rawContent.trim();
  if (!trimmed || trimmed.length < 5) {
    return { content: "", usage: null };
  }

  // Short content or no background system: direct translation
  if (trimmed.length <= 2000) {
    return translateDirect(trimmed, agentRole, locale);
  }

  // Long content: try SummarizerActor for map-reduce
  try {
    const { backgroundSystem } = await import("./actors/background-system");
    if (backgroundSystem.initialized) {
      const result = await backgroundSystem.request<{
        content: string;
        usage: TokenUsage | null;
      }>(
        "summarizer",
        "summarize_request",
        { content: trimmed, agentRole, locale },
        30_000, // 30s timeout for map-reduce
      );
      if (result.content) {
        return result;
      }
    }
  } catch (err) {
    console.warn(`[translateForUser] Summarizer failed, falling back: ${err}`);
  }

  // Fallback: direct translation with truncation
  return translateDirect(trimmed, agentRole, locale);
}

/**
 * Non-streaming chat completion
 */
export async function chat(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  allowedServices?: string[],
  systemPromptOverride?: string
): Promise<StreamChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const systemPrompt = systemPromptOverride || buildSystemPrompt(allowedServices);

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
      "X-Title": "AI Go Console",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const usage: TokenUsage | null = data.usage
    ? {
        promptTokens: data.usage.prompt_tokens ?? 0,
        completionTokens: data.usage.completion_tokens ?? 0,
        totalTokens: data.usage.total_tokens ?? 0,
      }
    : null;

  return { content, usage };
}
