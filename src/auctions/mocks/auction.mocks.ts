import { Auction, CreateAuctionPayload } from "auctions/auctions.validation";
import { addDays, subDays } from "date-fns";
import { Client } from "pg";

export const createMockedAuctionPayload = (productId: number): CreateAuctionPayload => ({
  product_id: productId,
  start_time: addDays(new Date(), 1),
  duration_hours: 24,
  starting_price_in_cents: 1000
});

export const createFinishedAuction = async (client: Client, userId: number, productId: number) => {
  // Temporarily drop the check constraint to allow creating an auction in the past
  await client.query("ALTER TABLE auctions DROP CONSTRAINT auctions_start_time_check");

  const auction = await client.query<Auction>(
    "INSERT INTO auctions (product_id, creator_id, start_time, duration_hours, starting_price_in_cents) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [productId, userId, subDays(new Date(), 10), 24, 1000]
  );

  // Restore the constraint (but don't validate existing rows)
  await client.query(
    "ALTER TABLE auctions ADD CONSTRAINT auctions_start_time_check CHECK (start_time > NOW()) NOT VALID"
  );
  return auction.rows[0];
};
