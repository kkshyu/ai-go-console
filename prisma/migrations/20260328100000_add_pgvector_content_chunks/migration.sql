-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Content chunks table for RAG (Retrieval-Augmented Generation)
-- Stores chunked content with vector embeddings for similarity search
CREATE TABLE content_chunks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source_type TEXT NOT NULL,        -- 'artifact' | 'agent_output'
  source_id TEXT NOT NULL,          -- reference to source record
  pipeline_id TEXT NOT NULL,        -- reference to agent_pipelines.id
  agent_role TEXT NOT NULL,         -- which agent produced this content
  chunk_index INTEGER NOT NULL,     -- ordering within the source
  content TEXT NOT NULL,            -- the actual text content
  embedding vector(1536),           -- text-embedding-3-small outputs 1536 dims
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_pipeline FOREIGN KEY (pipeline_id)
    REFERENCES agent_pipelines(id) ON DELETE CASCADE
);

-- Index for pipeline-scoped queries (most common access pattern)
CREATE INDEX idx_chunks_pipeline ON content_chunks(pipeline_id);

-- Index for source-scoped queries (e.g., find all chunks for an artifact)
CREATE INDEX idx_chunks_source ON content_chunks(source_type, source_id);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX idx_chunks_embedding ON content_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
