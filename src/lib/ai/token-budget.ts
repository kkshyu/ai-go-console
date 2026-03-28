/**
 * Token Budget & Context Pruning
 *
 * Provides rough token estimation and message pruning to keep
 * LLM requests within the context window budget.
 *
 * Token estimation uses a simple character-based heuristic:
 * ~4 chars per token for ASCII/English, ~2 chars per CJK character.
 */

const CJK_RANGE =
  /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u2e80-\u2eff\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g;

/** Estimate token count from text (~4 chars/token for English, ~2 for CJK). */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjkMatches = text.match(CJK_RANGE);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;
  const nonCjkCount = text.length - cjkCount;
  return Math.ceil(nonCjkCount / 4 + cjkCount / 2);
}

/** Estimate total tokens for an array of messages. */
export function estimateMessagesTokens(
  messages: Array<{ role: string; content: string }>,
): number {
  let total = 0;
  for (const m of messages) {
    // ~4 tokens overhead per message for role/formatting
    total += 4 + estimateTokens(m.content);
  }
  return total;
}

/**
 * Prune messages to fit within a token budget.
 *
 * Strategy:
 * - Always keep the first message (user's original request).
 * - Always keep the last `keepLastN` messages in full.
 * - For older messages in between, replace long assistant content with a
 *   truncated summary: first 200 chars + "[truncated, original: X tokens]".
 * - If still over budget after summarizing, drop the oldest middle messages.
 *
 * This is a pure function with no side effects.
 */
export function pruneMessages<
  T extends { role: string; content: string; agentRole?: string },
>(messages: T[], maxTokens: number, keepLastN: number = 3): T[] {
  if (messages.length === 0) return [];

  // If already within budget, return as-is
  if (estimateMessagesTokens(messages) <= maxTokens) {
    return messages;
  }

  const first = messages[0];
  const tailStart = Math.max(1, messages.length - keepLastN);
  const tail = messages.slice(tailStart);
  const middle = messages.slice(1, tailStart);

  // Budget remaining after first + tail
  const reservedTokens =
    estimateMessagesTokens([first]) + estimateMessagesTokens(tail);

  let middleBudget = maxTokens - reservedTokens;

  // Summarize middle messages (oldest first)
  const summarized: T[] = [];
  for (const m of middle) {
    const originalTokens = estimateTokens(m.content);

    if (m.role === "assistant" && originalTokens > 100) {
      const summary =
        m.content.slice(0, 200) +
        `\n...[truncated, original: ${originalTokens} tokens]`;
      const summaryTokens = 4 + estimateTokens(summary);

      if (middleBudget >= summaryTokens) {
        summarized.push({ ...m, content: summary });
        middleBudget -= summaryTokens;
      }
      // else drop the message entirely
    } else {
      const msgTokens = 4 + estimateTokens(m.content);
      if (middleBudget >= msgTokens) {
        summarized.push(m);
        middleBudget -= msgTokens;
      }
      // else drop the message
    }
  }

  return [first, ...summarized, ...tail];
}
