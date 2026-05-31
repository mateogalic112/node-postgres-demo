DROP TABLE IF EXISTS user_customers;
DROP INDEX IF EXISTS idx_embeddings_product_id;
DROP INDEX IF EXISTS idx_embeddings_hnsw_cosine;
DROP TABLE IF EXISTS products_embeddings;
DROP TABLE IF EXISTS order_details;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS bids;
DROP INDEX IF EXISTS idx_unique_active_auction_per_product;
DROP TABLE IF EXISTS auctions;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
-- Triggers are dropped with their tables; the shared function is not.
DROP FUNCTION IF EXISTS set_updated_at();
-- Note: Not dropping vector extension as it may be shared
