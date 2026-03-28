/**
 * File Processor Background Actor
 *
 * Extracts text content from uploaded files and triggers embedding generation.
 * Handles images (via LLM vision), text/code files (direct read), and PDFs.
 */

import { BackgroundActor } from "./background-actor";
import type { BackgroundMessage, ProcessFilePayload, ProcessFileResultPayload } from "./types";
import { prisma } from "../db";
import { streamChat, type ChatMessage, type ChatMessageContentPart } from "../ai";

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".ts", ".tsx", ".js", ".jsx", ".py", ".json", ".csv",
  ".html", ".css", ".scss", ".yaml", ".yml", ".toml", ".xml", ".sql",
  ".sh", ".bash", ".zsh", ".env", ".log", ".ini", ".cfg", ".conf",
  ".go", ".rs", ".java", ".kt", ".swift", ".rb", ".php", ".c", ".cpp",
  ".h", ".hpp", ".vue", ".svelte", ".astro", ".prisma", ".graphql",
]);

const MAX_TEXT_LENGTH = 50_000; // 50KB text limit for extraction

function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

function isTextFile(mimeType: string, fileName: string): boolean {
  if (mimeType.startsWith("text/")) return true;
  if (mimeType === "application/json") return true;
  if (mimeType === "application/xml") return true;
  if (mimeType === "application/javascript") return true;
  if (mimeType === "application/typescript") return true;
  return TEXT_EXTENSIONS.has(getFileExtension(fileName));
}

function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isPdfFile(mimeType: string, fileName: string): boolean {
  return mimeType === "application/pdf" || getFileExtension(fileName) === ".pdf";
}

export class FileProcessorActor extends BackgroundActor {
  constructor(id: string) {
    super(id, "file_processor");
  }

  async process(message: BackgroundMessage): Promise<ProcessFileResultPayload> {
    const payload = message.payload as ProcessFilePayload;
    const { fileId, storagePath, mimeType, fileName, conversationId } = payload;

    try {
      // Update status to processing
      await prisma.chatFile.update({
        where: { id: fileId },
        data: { status: "processing" },
      });

      let extractedText = "";

      if (isTextFile(mimeType, fileName)) {
        // Direct text read
        const buffer = await (await import("../file-storage")).readFileFromStorage(storagePath);
        extractedText = buffer.toString("utf-8").slice(0, MAX_TEXT_LENGTH);
      } else if (isImageFile(mimeType)) {
        // Use LLM vision to describe image
        extractedText = await this.describeImage(storagePath, mimeType);
      } else if (isPdfFile(mimeType, fileName)) {
        // Extract text from PDF
        try {
          const buffer = await (await import("../file-storage")).readFileFromStorage(storagePath);
          const pdfParse = (await import("pdf-parse")).default;
          const pdf = await pdfParse(buffer);
          extractedText = (pdf.text || "").slice(0, MAX_TEXT_LENGTH);
          if (!extractedText.trim()) {
            extractedText = `[PDF with no extractable text: ${fileName}]`;
          }
        } catch {
          extractedText = `[Unable to extract text from PDF: ${fileName}]`;
        }
      } else {
        // Unknown type — try reading as text
        try {
          const buffer = await (await import("../file-storage")).readFileFromStorage(storagePath);
          const text = buffer.toString("utf-8").slice(0, MAX_TEXT_LENGTH);
          // Check if it's valid text (not binary garbage)
          if (/[\x00-\x08\x0E-\x1F]/.test(text.slice(0, 1000))) {
            extractedText = `[Binary file: ${fileName}, ${mimeType}]`;
          } else {
            extractedText = text;
          }
        } catch {
          extractedText = `[Unable to extract text from: ${fileName}]`;
        }
      }

      // Update DB with extracted text
      await prisma.chatFile.update({
        where: { id: fileId },
        data: {
          extractedText,
          status: "ready",
        },
      });

      // Trigger embedding generation if we have meaningful text and a conversation
      if (extractedText.length > 50 && conversationId) {
        try {
          const { backgroundSystem } = await import("./background-system");
          if (backgroundSystem.initialized) {
            backgroundSystem.fireAndForget("embedding", "embed_request", {
              sourceType: "artifact" as const,
              sourceId: fileId,
              conversationId,
              agentRole: "user",
              content: extractedText,
            });
          }
        } catch {
          // Embedding is optional
        }
      }

      return { fileId, extractedText, success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[FileProcessorActor] Failed to process ${fileId}:`, error);

      await prisma.chatFile.update({
        where: { id: fileId },
        data: { status: "error" },
      }).catch(() => {});

      return { fileId, extractedText: "", success: false };
    }
  }

  private async describeImage(storagePath: string, mimeType: string): Promise<string> {
    const buffer = await (await import("../file-storage")).readFileFromStorage(storagePath);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const parts: ChatMessageContentPart[] = [
      { type: "text", text: "Describe this image in detail. Include any text visible in the image. Respond in the same language as any text in the image, or in English if no text is visible." },
      { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
    ];

    const messages: ChatMessage[] = [
      { role: "user", content: parts },
    ];

    let description = "";
    await streamChat(
      messages,
      (chunk) => { description += chunk; },
      "anthropic/claude-haiku-4.5",
    );

    return description || "[Image description unavailable]";
  }
}
