CREATE INDEX IF NOT EXISTS idx_bids_auction_amount ON bids (auction_id, amount_in_cents DESC);
