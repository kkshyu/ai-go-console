/**
 * OpenRouter Embedding API
 *
 * Generates vector embeddings using OpenRouter's embedding endpoint.
 * Uses the same auth pattern as the existing chat functions in ai.ts.
 */

const OPENROUTER_EMBEDDING_URL = "https://openrouter.ai/api/v1/embeddings";
const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

function getHeaders(): Record<string, string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
    "X-Title": "AI Go Console",
  };
}

/**
 * Generate embedding for a single text.
 * Returns empty array on failure (graceful fallback).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const results = await generateEmbeddings([text]);
  return results[0] || [];
}

/**
 * Generate embeddings for multiple texts in a single API call.
 * Returns array of embedding vectors. Failed embeddings are empty arrays.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const response = await fetch(OPENROUTER_EMBEDDING_URL, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.warn(`[embeddings] API error ${response.status}: ${errorText}`);
      return texts.map(() => []);
    }

    const data = (await response.json()) as {
      data?: Array<{ embedding: number[]; index: number }>;
    };

    if (!data.data || !Array.isArray(data.data)) {
      console.warn("[embeddings] Unexpected response format");
      return texts.map(() => []);
    }

    // Sort by index to ensure order matches input
    const sorted = [...data.data].sort((a, b) => a.index - b.index);
    return sorted.map((item) => item.embedding || []);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[embeddings] Failed to generate embeddings: ${msg}`);
    return texts.map(() => []);
  }
}
