CREATE UNIQUE INDEX CONCURRENTLY idx_unique_active_auction_per_product 
ON auctions (product_id) 
WHERE is_cancelled = FALSE;