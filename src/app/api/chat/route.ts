import { NextRequest } from "next/server";
import { streamChat, type ChatMessage } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { messages } = body as { messages: ChatMessage[] };

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Messages array required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start streaming in background
  (async () => {
    try {
      await streamChat(messages, (chunk) => {
        const data = JSON.stringify({ content: chunk });
        writer.write(encoder.encode(`data: ${data}\n\n`));
      });
      writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unknown error";
      writer.write(
        encoder.encode(
          `data: ${JSON.stringify({ error: msg })}\n\n`
        )
      );
    } finally {
      writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
