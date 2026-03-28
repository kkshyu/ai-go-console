-- Remove unused pipeline_id column from chat_files
DROP INDEX IF EXISTS "chat_files_pipeline_id_idx";
ALTER TABLE "chat_files" DROP COLUMN IF EXISTS "pipeline_id";

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create content_chunks table for RAG embedding storage
CREATE TABLE "content_chunks" (
    "id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "agent_role" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "content_chunks_pkey" PRIMARY KEY ("id")
);

-- Indexes for efficient querying
CREATE INDEX "idx_chunks_conversation" ON "content_chunks"("conversation_id");
CREATE INDEX "idx_chunks_source" ON "content_chunks"("source_id");
