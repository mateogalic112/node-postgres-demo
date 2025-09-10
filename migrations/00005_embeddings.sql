-- pgvector extension (requires it to be installed)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE products_embeddings (
    id bigserial PRIMARY KEY, 
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- HNSW index for vector search using cosine distance
CREATE INDEX idx_embeddings_hnsw_cosine
  ON products_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- index for product_id lookups/joins
CREATE INDEX idx_embeddings_product_id
  ON products_embeddings (product_id);