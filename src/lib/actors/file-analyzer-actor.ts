/**
 * File Analyzer Background Actor
 *
 * Generates summaries and structural analysis of uploaded files.
 * Uses LLM for large files, direct content for small files.
 */

import { BackgroundActor } from "./background-actor";
import type { BackgroundMessage, AnalyzeFilePayload, AnalyzeFileResultPayload } from "./types";
import { prisma } from "../db";
import { streamChat, type ChatMessage, type ChatMessageContentPart } from "../ai";

const SMALL_FILE_THRESHOLD = 2000; // chars — below this, content IS the summary
const MAX_CONTENT_FOR_SUMMARY = 30_000; // chars — truncate before sending to LLM

export class FileAnalyzerActor extends BackgroundActor {
  constructor(id: string) {
    super(id, "file_analyzer");
  }

  async process(message: BackgroundMessage): Promise<AnalyzeFileResultPayload> {
    const payload = message.payload as AnalyzeFilePayload;
    const { fileId, storagePath, mimeType, fileName } = payload;

    try {
      // Wait briefly for FileProcessor to populate extractedText
      let extractedText = payload.extractedText;
      if (!extractedText) {
        // Poll DB for extracted text (FileProcessor may have finished)
        for (let i = 0; i < 5; i++) {
          const file = await prisma.chatFile.findUnique({
            where: { id: fileId },
            select: { extractedText: true, status: true },
          });
          if (file?.extractedText) {
            extractedText = file.extractedText;
            break;
          }
          // Wait 2 seconds before retry
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      let summary = "";

      if (mimeType.startsWith("image/")) {
        // For images, generate a visual description directly
        summary = await this.analyzeImage(storagePath, mimeType, fileName);
      } else if (extractedText) {
        if (extractedText.length <= SMALL_FILE_THRESHOLD) {
          // Small file — content is the summary
          summary = `File "${fileName}": ${extractedText.slice(0, SMALL_FILE_THRESHOLD)}`;
        } else {
          // Large file — use LLM to summarize
          summary = await this.summarizeText(extractedText, fileName, mimeType);
        }
      } else {
        summary = `[File "${fileName}" (${mimeType}) — content could not be extracted]`;
      }

      // Update DB
      await prisma.chatFile.update({
        where: { id: fileId },
        data: {
          summary,
          status: "ready",
        },
      });

      return { fileId, summary, success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[FileAnalyzerActor] Failed to analyze ${fileId}:`, error);

      await prisma.chatFile.update({
        where: { id: fileId },
        data: { status: "error" },
      }).catch(() => {});

      return { fileId, summary: "", success: false };
    }
  }

  private async analyzeImage(storagePath: string, mimeType: string, fileName: string): Promise<string> {
    const { readFileFromMinIO } = await import("../minio-storage");
    const buffer = await readFileFromMinIO(storagePath);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const parts: ChatMessageContentPart[] = [
      {
        type: "text",
        text: `Analyze this image file "${fileName}". Provide a concise summary including:
1. What the image shows (main subject, scene)
2. Any text or data visible in the image
3. Key details that would be useful as context for an AI assistant
Keep the summary under 500 words.`,
      },
      { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
    ];

    const messages: ChatMessage[] = [{ role: "user", content: parts }];

    let result = "";
    await streamChat(messages, (chunk) => { result += chunk; }, "anthropic/claude-haiku-4.5");

    return result || `[Image "${fileName}" — analysis unavailable]`;
  }

  private async summarizeText(text: string, fileName: string, mimeType: string): Promise<string> {
    const truncated = text.slice(0, MAX_CONTENT_FOR_SUMMARY);
    const isCode = mimeType.startsWith("text/") || /\.(ts|js|py|go|rs|java|rb|php|c|cpp|swift|kt)$/i.test(fileName);

    const prompt = isCode
      ? `Analyze this code file "${fileName}". Provide a concise summary including:
1. Purpose/functionality of the code
2. Main functions, classes, or exports
3. Key dependencies or patterns used
Keep the summary under 300 words.

\`\`\`
${truncated}
\`\`\``
      : `Summarize this file "${fileName}" (${mimeType}). Provide a concise summary including:
1. Main topic or purpose
2. Key information or data points
3. Structure overview
Keep the summary under 300 words.

Content:
${truncated}`;

    const messages: ChatMessage[] = [{ role: "user", content: prompt }];

    let result = "";
    await streamChat(messages, (chunk) => { result += chunk; }, "anthropic/claude-haiku-4.5");

    return result || `[Summary unavailable for "${fileName}"]`;
  }
}
