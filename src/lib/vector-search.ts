/**
 * Vector Search Utility
 *
 * Stores and retrieves content chunks with vector embeddings
 * using pgvector extension in PostgreSQL.
 *
 * Uses prisma.$queryRawUnsafe for vector operations since
 * Prisma doesn't natively support the vector column type.
 */

import { prisma } from "./db";

export interface SearchResult {
  content: string;
  similarity: number;
  agentRole: string;
  sourceId: string;
}

export interface StorableChunk {
  content: string;
  embedding: number[];
}

/**
 * Store content chunks with their embeddings.
 */
export async function storeChunks(
  conversationId: string,
  sourceType: string,
  sourceId: string,
  agentRole: string,
  chunks: StorableChunk[],
): Promise<void> {
  if (chunks.length === 0) return;

  // Filter out chunks with empty embeddings
  const validChunks = chunks.filter(
    (c) => c.embedding && c.embedding.length > 0,
  );
  if (validChunks.length === 0) return;

  // Batch insert using raw SQL
  const values = validChunks
    .map((chunk, i) => {
      const embeddingStr = `[${chunk.embedding.join(",")}]`;
      return `(gen_random_uuid()::text, $1, $2, $3, $4, ${i}, $${5 + i}, '${embeddingStr}'::vector)`;
    })
    .join(", ");

  const params = [
    sourceType,
    sourceId,
    conversationId,
    agentRole,
    ...validChunks.map((c) => c.content),
  ];

  try {
    await prisma.$queryRawUnsafe(
      `INSERT INTO content_chunks (id, source_type, source_id, conversation_id, agent_role, chunk_index, content, embedding)
       VALUES ${values}`,
      ...params,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[vector-search] Failed to store chunks: ${msg}`);
  }
}

/**
 * Search for similar chunks using cosine similarity.
 */
export async function searchSimilarChunks(
  conversationId: string,
  queryEmbedding: number[],
  options?: {
    limit?: number;
    minSimilarity?: number;
    sourceType?: string;
  },
): Promise<SearchResult[]> {
  if (!queryEmbedding || queryEmbedding.length === 0) return [];

  const limit = options?.limit ?? 20;
  const minSimilarity = options?.minSimilarity ?? 0.3;
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  try {
    const sourceTypeClause = options?.sourceType
      ? `AND source_type = '${options.sourceType}'`
      : "";

    const results = await prisma.$queryRawUnsafe<
      Array<{
        content: string;
        similarity: number;
        agent_role: string;
        source_id: string;
      }>
    >(
      `SELECT content, agent_role, source_id,
              1 - (embedding <=> '${embeddingStr}'::vector) as similarity
       FROM content_chunks
       WHERE conversation_id = $1
         ${sourceTypeClause}
         AND 1 - (embedding <=> '${embeddingStr}'::vector) >= $2
       ORDER BY embedding <=> '${embeddingStr}'::vector
       LIMIT $3`,
      conversationId,
      minSimilarity,
      limit,
    );

    return results.map((r) => ({
      content: r.content,
      similarity: Number(r.similarity),
      agentRole: r.agent_role,
      sourceId: r.source_id,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[vector-search] Search failed: ${msg}`);
    return [];
  }
}

/**
 * Assemble context from search results within a character budget.
 */
export function assembleContext(
  results: SearchResult[],
  maxChars: number = 8000,
): string {
  if (results.length === 0) return "";

  let context = "\n\nRelevant artifacts from this conversation:\n";
  let charCount = context.length;

  for (const r of results) {
    const entry = `[${r.agentRole.toUpperCase()} (similarity: ${r.similarity.toFixed(2)})]:\n${r.content}\n\n`;
    if (charCount + entry.length > maxChars) break;
    context += entry;
    charCount += entry.length;
  }

  return context;
}
