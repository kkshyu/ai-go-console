/**
 * Retrieval Background Actor
 *
 * Searches the vector store for content chunks relevant to a query.
 * Used to build artifact context via RAG instead of full concatenation.
 */

import { BackgroundActor } from "./background-actor";
import type {
  BackgroundMessage,
  RetrieveRequestPayload,
  RetrieveResultPayload,
} from "./types";
import { generateEmbedding } from "../embeddings";
import { searchSimilarChunks, assembleContext } from "../vector-search";

export class RetrievalActor extends BackgroundActor {
  constructor(id: string) {
    super(id, "retrieval");
  }

  async process(message: BackgroundMessage): Promise<RetrieveResultPayload> {
    const payload = message.payload as RetrieveRequestPayload;

    // 1. Generate embedding for the query
    const queryEmbedding = await generateEmbedding(payload.query);
    if (queryEmbedding.length === 0) {
      return { context: "", chunks: [] };
    }

    // 2. Search for similar chunks
    const results = await searchSimilarChunks(
      payload.conversationId,
      queryEmbedding,
      {
        limit: 20,
        minSimilarity: 0.3,
        sourceType: payload.sourceType,
      },
    );

    // 3. Assemble context within character budget
    const context = assembleContext(results, payload.maxChars || 8000);

    return {
      context,
      chunks: results.map((r) => ({
        content: r.content,
        similarity: r.similarity,
        agentRole: r.agentRole,
      })),
    };
  }
}
