/**
 * Summarizer Background Actor
 *
 * Translates and summarizes agent output for end users.
 * - Short content (≤2000 chars): direct translation
 * - Long content: map-reduce (chunk → summarize each → combine)
 */

import { BackgroundActor } from "./background-actor";
import type {
  BackgroundMessage,
  SummarizeRequestPayload,
  SummarizeResultPayload,
} from "./types";
import { translateDirect, chat, stripJsonBlocks, OUTPUT_MODEL, type TokenUsage } from "../ai";
import { chunkContent } from "../chunking";

const DIRECT_THRESHOLD = 2000;

const LOCALE_LANGUAGE_MAP: Record<string, string> = {
  "zh-TW": "繁體中文",
  "en": "English",
};

export class SummarizerActor extends BackgroundActor {
  constructor(id: string) {
    super(id, "summarizer");
  }

  async process(message: BackgroundMessage): Promise<SummarizeResultPayload> {
    const payload = message.payload as SummarizeRequestPayload;
    const { content, agentRole, locale } = payload;

    if (!content || content.trim().length < 5) {
      return { content: "", usage: null };
    }

    const trimmed = content.trim();

    // Short content: direct translation
    if (trimmed.length <= DIRECT_THRESHOLD) {
      const result = await translateDirect(trimmed, agentRole, locale);
      return { content: result.content, usage: result.usage };
    }

    // Long content: map-reduce
    try {
      return await this.mapReduce(trimmed, agentRole, locale);
    } catch (err) {
      console.warn(
        `[SummarizerActor] Map-reduce failed, falling back: ${err instanceof Error ? err.message : err}`,
      );
      // Fallback: try direct translation on truncated content
      const fallbackResult = await translateDirect(trimmed, agentRole, locale);
      if (fallbackResult.content) {
        return { content: fallbackResult.content, usage: fallbackResult.usage };
      }
      // Last resort: strip JSON
      return { content: stripJsonBlocks(trimmed) || "處理完成。", usage: null };
    }
  }

  private async mapReduce(
    content: string,
    agentRole: string,
    locale: string,
  ): Promise<SummarizeResultPayload> {
    const languageName = LOCALE_LANGUAGE_MAP[locale] || "繁體中文";
    const chunks = chunkContent(content);

    // Map phase: summarize each chunk in parallel
    const mapPrompt = `You are a technical summarizer. Summarize the following content concisely in ${languageName}. Max 200 words. Focus on what was decided or accomplished.`;

    const mapResults = await Promise.allSettled(
      chunks.map((chunk) =>
        chat(
          [
            {
              role: "user",
              content: `Summarize this ${agentRole} agent output:\n\n${chunk.content}`,
            },
          ],
          OUTPUT_MODEL,
          mapPrompt,
        ),
      ),
    );

    // Collect successful summaries
    const summaries: string[] = [];
    const allUsage: (TokenUsage | null)[] = [];

    for (const result of mapResults) {
      if (result.status === "fulfilled" && result.value.content) {
        summaries.push(result.value.content);
        allUsage.push(result.value.usage);
      }
    }

    if (summaries.length === 0) {
      throw new Error("All map operations failed");
    }

    // Reduce phase: combine summaries into final user-facing message
    const reducePrompt = `You are a UX writer for AI Go, an app-building platform.
Combine the following summaries into a single, clear, user-friendly message in ${languageName}.
Rules:
- Be concise — one short paragraph or a few bullet points max
- Use a warm, professional tone
- Do not mention internal system details
- ALWAYS produce output`;

    const combinedInput = summaries
      .map((s, i) => `--- Part ${i + 1} ---\n${s}`)
      .join("\n\n");

    const reduceResult = await chat(
      [
        {
          role: "user",
          content: `Combine these summaries into a single user-friendly message:\n\n${combinedInput}`,
        },
      ],
      OUTPUT_MODEL,
      reducePrompt,
    );

    allUsage.push(reduceResult.usage);

    return {
      content: reduceResult.content,
      usage: aggregateUsage(allUsage),
    };
  }
}

function aggregateUsage(usages: (TokenUsage | null)[]): TokenUsage | null {
  const valid = usages.filter((u): u is TokenUsage => u !== null);
  if (valid.length === 0) return null;

  return {
    promptTokens: valid.reduce((sum, u) => sum + u.promptTokens, 0),
    completionTokens: valid.reduce((sum, u) => sum + u.completionTokens, 0),
    totalTokens: valid.reduce((sum, u) => sum + u.totalTokens, 0),
  };
}
