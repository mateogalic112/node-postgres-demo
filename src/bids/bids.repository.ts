import { DatabaseService } from "interfaces/database.interface";
import { Bid, bidSchema, CreateBidPayload } from "./bids.validation";
import { PoolClient } from "pg";

export class BidsRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async save(
    client: PoolClient,
    userId: number,
    payload: CreateBidPayload,
    idempotencyKey: string
  ) {
    const result = await client.query<Bid>(
      `INSERT INTO bids (auction_id, user_id, amount_in_cents, idempotency_key) 
           VALUES ($1, $2, $3, $4) 
           RETURNING *`,
      [payload.auction_id, userId, payload.amount_in_cents, idempotencyKey]
    );
    return bidSchema.parse(result.rows[0]);
  }

  public async getHighestBidAmountForAuction(
    client: PoolClient,
    auctionId: number
  ): Promise<number> {
    const result = await client.query<{ amount_in_cents: number }>(
      `SELECT amount_in_cents FROM bids 
       WHERE auction_id = $1 
       ORDER BY amount_in_cents DESC 
       LIMIT 1`,
      [auctionId]
    );
    if (result.rows.length === 0) {
      return 0;
    }
    return result.rows[0].amount_in_cents;
  }

  public async findBidByIdempotencyKey(client: PoolClient, idempotencyKey: string) {
    const result = await client.query<Bid>("SELECT * FROM bids WHERE idempotency_key = $1", [
      idempotencyKey
    ]);
    if (!result.rows[0]) {
      return null;
    }
    return bidSchema.parse(result.rows[0]);
  }

  public async getBids(auctionId: number) {
    const result = await this.DB.query<Bid>(
      `SELECT id, amount_in_cents, created_at 
	FROM bids 
	WHERE auction_id = $1 ORDER BY created_at DESC`,
      [auctionId]
    );
    return result.rows.map((row) => bidSchema.parse(row));
  }
}
