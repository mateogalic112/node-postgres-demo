import { DatabaseService } from "interfaces/database.interface";
import { Bid, CreateBidPayload } from "./bids.validation";
import { Auction } from "auctions/auctions.validation";
import { InternalServerError, NotFoundError } from "api/api.errors";
import { PoolClient } from "pg";

export class BidRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async createBid(
    client: PoolClient,
    userId: number,
    payload: CreateBidPayload,
    idempotencyKey: string
  ) {
    const result = await client.query<Bid>(
      `INSERT INTO bids (auction_id, user_id, amount_in_cents, idempotency_key, created_at) 
           VALUES ($1, $2, $3, $4, NOW()) 
           RETURNING *`,
      [payload.auction_id, userId, payload.amount_in_cents, idempotencyKey]
    );
    if (result.rows.length === 0) {
      throw new InternalServerError(
        "Unable to place bid due to high system load. Please try again."
      );
    }
    return result.rows[0];
  }

  public async getBiddingAuction(client: PoolClient, auctionId: number, userId: number) {
    const result = await client.query<Auction>(
      `SELECT * FROM auctions 
       WHERE id = $1 AND creator_id != $2 AND is_cancelled = FALSE 
       AND start_time < NOW() 
       AND start_time + duration_hours * INTERVAL '1 hour' > NOW()
       FOR UPDATE NOWAIT`,
      [auctionId, userId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError("Auction not found");
    }
    return result.rows[0];
  }

  public async getHighestBidAmountForAuction(
    client: PoolClient,
    auctionId: number
  ): Promise<number> {
    const result = await client.query<{ amount_in_cents: number }>(
      `SELECT amount_in_cents FROM bids 
       WHERE auction_id = $1 
       ORDER BY amount_in_cents DESC 
       LIMIT 1
       FOR UPDATE NOWAIT`,
      [auctionId]
    );
    if (result.rows.length === 0) {
      return 0;
    }
    return result.rows[0].amount_in_cents;
  }

  public async getBidsByAuctionId(auctionId: number) {
    const result = await this.DB.query<Array<Bid>>(
      "SELECT * FROM bids WHERE auction_id = $1 ORDER BY created_at DESC",
      [auctionId]
    );
    return result.rows;
  }
}
