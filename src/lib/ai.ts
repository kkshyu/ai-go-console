const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are AI Go, an intelligent assistant that helps users create web applications.

You guide users through creating apps by asking clarifying questions and then generating them.

When you have enough information to create an app, respond with a JSON block in this format:
\`\`\`json
{
  "action": "create_app",
  "name": "App Name",
  "template": "react-spa",
  "description": "Brief description",
  "config": {}
}
\`\`\`

Available templates:
- "react-spa": Single-page React application with Vite and TypeScript. Best for dashboards, landing pages, interactive UIs.
- "node-api": Express.js REST API with TypeScript. Best for backend services, APIs, webhooks.
- "nextjs-fullstack": Full-stack Next.js application with App Router and Tailwind. Best for full websites with both frontend and backend.

Guidelines:
1. Ask the user what they want to build
2. Suggest the most appropriate template
3. Ask for the app name if not provided
4. Confirm the plan before generating
5. After confirmation, output the JSON action block

Be concise and helpful. Respond in the same language as the user.`;

/**
 * Stream chat completion from OpenRouter
 */
export async function streamChat(
  messages: ChatMessage[],
  onChunk: (text: string) => void
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
      "X-Title": "AI Go Console",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
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
      } catch {
        // Skip malformed JSON lines
      }
    }
  }

  return fullContent;
}

/**
 * Non-streaming chat completion
 */
export async function chat(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
      "X-Title": "AI Go Console",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
