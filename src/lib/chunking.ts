/**
 * Content Chunking Utility
 *
 * Splits long text into meaningful chunks for embedding and summarization.
 * Optimized for JSON-heavy agent outputs with code blocks.
 */

export interface Chunk {
  content: string;
  index: number;
}

const DEFAULT_MAX_CHUNK_SIZE = 1500;
const MIN_CHUNK_SIZE = 100;

/**
 * Split content into chunks suitable for embedding.
 *
 * Strategy:
 * 1. Split on JSON code block boundaries (```json...```)
 * 2. If a JSON block exceeds maxChunkSize, split by top-level keys
 * 3. For non-JSON text, split by paragraph boundaries
 */
export function chunkContent(
  content: string,
  maxChunkSize: number = DEFAULT_MAX_CHUNK_SIZE,
): Chunk[] {
  if (!content || content.length <= maxChunkSize) {
    return [{ content, index: 0 }];
  }

  const segments = splitOnCodeBlocks(content);
  const chunks: Chunk[] = [];
  let index = 0;

  for (const segment of segments) {
    if (segment.length <= maxChunkSize) {
      if (segment.trim().length >= MIN_CHUNK_SIZE) {
        chunks.push({ content: segment, index: index++ });
      }
      continue;
    }

    // Check if this is a JSON code block
    if (segment.startsWith("```json") || segment.startsWith("```")) {
      const jsonChunks = splitJsonBlock(segment, maxChunkSize);
      for (const jc of jsonChunks) {
        chunks.push({ content: jc, index: index++ });
      }
    } else {
      // Split plain text by paragraphs
      const textChunks = splitByParagraphs(segment, maxChunkSize);
      for (const tc of textChunks) {
        chunks.push({ content: tc, index: index++ });
      }
    }
  }

  // Ensure we always return at least one chunk
  if (chunks.length === 0) {
    return [{ content: content.slice(0, maxChunkSize), index: 0 }];
  }

  return chunks;
}

/**
 * Split content on code block boundaries (```...```).
 * Returns alternating text and code block segments.
 */
function splitOnCodeBlocks(content: string): string[] {
  const segments: string[] = [];
  const regex = /```[\s\S]*?```/g;
  let lastIndex = 0;

  let match;
  while ((match = regex.exec(content)) !== null) {
    // Add text before the code block
    const before = content.slice(lastIndex, match.index).trim();
    if (before) segments.push(before);

    // Add the code block
    segments.push(match[0]);
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  const remaining = content.slice(lastIndex).trim();
  if (remaining) segments.push(remaining);

  return segments;
}

/**
 * Split a JSON code block into smaller chunks by top-level keys.
 */
function splitJsonBlock(block: string, maxSize: number): string[] {
  // Extract JSON content from code block
  const jsonMatch = block.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) return [block.slice(0, maxSize)];

  const jsonStr = jsonMatch[1];

  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed !== "object" || parsed === null) {
      return [block.slice(0, maxSize)];
    }

    const chunks: string[] = [];
    const keys = Object.keys(parsed);

    // Group keys into chunks that fit within maxSize
    let currentChunk: Record<string, unknown> = {};
    let currentSize = 2; // {}

    for (const key of keys) {
      const value = parsed[key];
      const entryStr = JSON.stringify({ [key]: value });
      const entrySize = entryStr.length;

      if (currentSize + entrySize > maxSize && Object.keys(currentChunk).length > 0) {
        chunks.push(JSON.stringify(currentChunk, null, 2));
        currentChunk = {};
        currentSize = 2;
      }

      currentChunk[key] = value;
      currentSize += entrySize;
    }

    if (Object.keys(currentChunk).length > 0) {
      chunks.push(JSON.stringify(currentChunk, null, 2));
    }

    return chunks.length > 0 ? chunks : [block.slice(0, maxSize)];
  } catch {
    // JSON parse failed — split by size
    return splitBySize(jsonStr, maxSize);
  }
}

/**
 * Split text by paragraph boundaries (\n\n).
 */
function splitByParagraphs(text: string, maxSize: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxSize && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += (current ? "\n\n" : "") + para;
  }

  if (current.trim()) {
    // If remaining chunk is still too big, split by size
    if (current.length > maxSize) {
      chunks.push(...splitBySize(current, maxSize));
    } else {
      chunks.push(current.trim());
    }
  }

  return chunks;
}

/**
 * Last resort: split by character count with line boundary preference.
 */
function splitBySize(text: string, maxSize: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxSize) {
    // Try to split at a line boundary
    let splitPoint = remaining.lastIndexOf("\n", maxSize);
    if (splitPoint < maxSize * 0.5) {
      // No good line boundary, split at maxSize
      splitPoint = maxSize;
    }
    chunks.push(remaining.slice(0, splitPoint).trim());
    remaining = remaining.slice(splitPoint).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}
