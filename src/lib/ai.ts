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
  { id: "anthropic/claude-haiku-4", label: "Claude Haiku 4" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "google/gemini-2.5-flash-preview", label: "Gemini 2.5 Flash" },
] as const;

export const DEFAULT_MODEL = AVAILABLE_MODELS[0].id;

function buildSystemPrompt(allowedServices?: string[]): string {
  const serviceList = allowedServices && allowedServices.length > 0
    ? allowedServices.join(", ")
    : "disk, postgresql, supabase, stripe, hasura";

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

Each service provides an HTTP interface:
- "disk": File/object storage via HTTP API
- "postgresql": PostgreSQL database via HTTP endpoint (e.g., PostgREST)
- "supabase": Supabase platform (database, auth, storage, realtime)
- "stripe": Stripe payment processing API
- "hasura": Hasura GraphQL engine

Guidelines:
1. Ask the user what they want to build
2. Suggest the most appropriate template
3. Ask for the app name if not provided
4. If the app needs a database, storage, or payments, include the required service types in "requiredServices"
5. Only include service types that are available for this organization
6. Confirm the plan before generating
7. After confirmation, output the JSON action block

Be concise and helpful. Respond in the same language as the user.`;
}

/**
 * Stream chat completion from OpenRouter
 */
export async function streamChat(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  model: string = DEFAULT_MODEL,
  allowedServices?: string[]
): Promise<StreamChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const systemPrompt = buildSystemPrompt(allowedServices);

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
export async function chat(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  allowedServices?: string[]
): Promise<StreamChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const systemPrompt = buildSystemPrompt(allowedServices);

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
