DROP INDEX IF EXISTS idx_embeddings_product_id;
DROP INDEX IF EXISTS idx_embeddings_hnsw_cosine;
DROP TABLE IF EXISTS products_embeddings;
-- Note: Not dropping vector extension as other tables may use it
