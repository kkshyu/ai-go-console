const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
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

  return `You are AI Go, an intelligent assistant that helps users create web applications.

You guide users through creating apps by asking clarifying questions and then generating them.

When you have enough information to create an app, respond with a JSON block in this format:
\`\`\`json
{
  "action": "create_app",
  "name": "App Name",
  "template": "react-spa",
  "description": "Brief description",
  "config": {},
  "requiredServices": ["postgresql"]
}
\`\`\`

Available templates:
- "react-spa": Single-page React application with Vite and TypeScript. Best for dashboards, landing pages, interactive UIs.
- "node-api": Express.js REST API with TypeScript. Best for backend services, APIs, webhooks.
- "nextjs-fullstack": Full-stack Next.js application with App Router and Tailwind. Best for full websites with both frontend and backend.

Available service types for this organization: ${serviceList}

Services by category:

Database:
- "postgresql": PostgreSQL database via HTTP endpoint (e.g., PostgREST)
- "mysql": MySQL database via HTTP endpoint
- "mongodb": MongoDB database via HTTP endpoint

Storage:
- "s3": S3-compatible object storage (AWS S3, MinIO, Cloudflare R2, etc.)
- "gcs": Google Cloud Storage
- "azure_blob": Azure Blob Storage

Payment:
- "stripe": Stripe payment processing API
- "paypal": PayPal payment processing API
- "ecpay": ECPay payment gateway (Taiwan)

Email:
- "sendgrid": SendGrid email delivery API
- "ses": Amazon Simple Email Service
- "mailgun": Mailgun email delivery API

SMS:
- "twilio": Twilio SMS and voice API
- "vonage": Vonage (Nexmo) SMS API
- "aws_sns": Amazon Simple Notification Service

Authentication:
- "auth0": Auth0 identity platform
- "firebase_auth": Firebase Authentication
- "line_login": LINE Login (OAuth)

Platform:
- "supabase": Supabase platform (database, auth, storage, realtime)
- "hasura": Hasura GraphQL engine

Chat:
- "line_bot": LINE Bot Messaging API
- "whatsapp": WhatsApp Business API (Meta Cloud API)
- "discord": Discord Bot API
- "telegram": Telegram Bot API

Guidelines:
1. Ask the user what they want to build
2. Suggest the most appropriate template
3. Ask for the app name if not provided
4. If the app needs a database, storage, payments, email, SMS, or authentication, include the required service types in "requiredServices"
5. Only include service types that are available for this organization
6. Confirm the plan before generating
7. After confirmation, output the JSON action block

Be concise and helpful. Respond in the same language as the user.`;
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
export async function streamChat(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
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
      stream: true,
      max_tokens: 4096,
    }),
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
 * Translate raw agent output into a user-friendly message.
 * Uses a fast/cheap model to rewrite technical agent output
 * as clear, conversational text for end users.
 */
export async function translateForUser(
  rawContent: string,
  agentRole: string,
): Promise<StreamChatResult> {
  // Use full content (including JSON) for translation context.
  // The translator will extract the meaningful parts.
  const trimmed = rawContent.trim();
  if (!trimmed || trimmed.length < 5) {
    return { content: "", usage: null };
  }

  // Cap input to avoid wasting tokens — translator only needs a summary
  const truncated = trimmed.length > 2000 ? trimmed.slice(0, 2000) + "\n..." : trimmed;

  const systemPrompt = `You are a UX writer for AI Go, an app-building platform. Your job is to rewrite internal agent output into clear, friendly messages for end users.

Rules:
- Keep the SAME language as the input (if input is Chinese, output Chinese)
- Never include raw JSON, code blocks, technical jargon, or internal action names in your output
- Be concise — one short paragraph or a few bullet points max
- Use a warm, professional tone
- Summarize what the agent decided or accomplished, based on the JSON data
- If the agent is dispatching work, briefly describe what's being done next
- If the agent designed architecture, summarize the technology choices
- If the agent created an app, summarize the app name, features, and services
- Do not mention other agents, pipeline stages, or internal system details
- ALWAYS produce output — never say you didn't receive content`;

  try {
    const result = await chat(
      [
        {
          role: "user",
          content: `Rewrite this ${agentRole} agent output as a user-friendly message:\n\n${truncated}`,
        },
      ],
      OUTPUT_MODEL,
      undefined,
      systemPrompt,
    );

    return result;
  } catch {
    // If translation fails, return stripped version as fallback
    const fallback = stripJsonBlocks(rawContent);
    return { content: fallback || "", usage: null };
  }
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
