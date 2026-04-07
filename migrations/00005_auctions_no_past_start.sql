ALTER TABLE auctions
ADD CONSTRAINT chk_start_time_not_in_past
CHECK (start_time >= created_at);
