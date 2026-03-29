/**
 * Retrieval Background Actor
 *
 * Searches the vector store for content chunks relevant to a query.
 * Used to build artifact context via RAG instead of full concatenation.
 *
 * NOTE: Vector store (content_chunks) is currently disabled.
 * This actor returns empty results until the vector store is re-enabled.
 */

import { BackgroundActor } from "./background-actor";
import type {
  BackgroundMessage,
  RetrieveResultPayload,
} from "./types";

export class RetrievalActor extends BackgroundActor {
  constructor(id: string) {
    super(id, "retrieval");
  }

  async process(_message: BackgroundMessage): Promise<RetrieveResultPayload> {
    return { context: "", chunks: [] };
  }
}
