/**
 * Embedding Background Actor
 *
 * Generates vector embeddings for content chunks and stores them
 * in the vector database. Runs in the background, fire-and-forget.
 */

import { BackgroundActor } from "./background-actor";
import type { BackgroundMessage, EmbedRequestPayload, EmbedResultPayload } from "./types";
import { chunkContent } from "../chunking";
import { generateEmbeddings } from "../embeddings";
import { storeChunks } from "../vector-search";

export class EmbeddingActor extends BackgroundActor {
  constructor(id: string) {
    super(id, "embedding");
  }

  async process(message: BackgroundMessage): Promise<EmbedResultPayload> {
    const payload = message.payload as EmbedRequestPayload;

    // 1. Chunk the content
    const chunks = chunkContent(payload.content);
    if (chunks.length === 0) {
      return { sourceId: payload.sourceId, chunksStored: 0, success: true };
    }

    // 2. Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(chunks.map((c) => c.content));

    // 3. Pair chunks with embeddings, skip any with empty embeddings
    const storableChunks = chunks
      .map((c, i) => ({
        content: c.content,
        embedding: embeddings[i] || [],
      }))
      .filter((c) => c.embedding.length > 0);

    if (storableChunks.length === 0) {
      console.warn(`[EmbeddingActor] No valid embeddings generated for source ${payload.sourceId}`);
      return { sourceId: payload.sourceId, chunksStored: 0, success: false };
    }

    // 4. Store in vector database
    await storeChunks(
      payload.conversationId,
      payload.sourceType,
      payload.sourceId,
      payload.agentRole,
      storableChunks,
    );

    return {
      sourceId: payload.sourceId,
      chunksStored: storableChunks.length,
      success: true,
    };
  }
}
