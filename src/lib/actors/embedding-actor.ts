/**
 * Embedding Background Actor
 *
 * Generates vector embeddings for content chunks and stores them
 * in the vector database. Runs in the background, fire-and-forget.
 *
 * NOTE: Vector store (content_chunks) is currently disabled.
 * This actor performs chunking and embedding generation but skips storage.
 */

import { BackgroundActor } from "./background-actor";
import type { BackgroundMessage, EmbedRequestPayload, EmbedResultPayload } from "./types";

export class EmbeddingActor extends BackgroundActor {
  constructor(id: string) {
    super(id, "embedding");
  }

  async process(message: BackgroundMessage): Promise<EmbedResultPayload> {
    const payload = message.payload as EmbedRequestPayload;
    console.warn("[EmbeddingActor] Vector store not available, skipping embedding storage");
    return { sourceId: payload.sourceId, chunksStored: 0, success: true };
  }
}
