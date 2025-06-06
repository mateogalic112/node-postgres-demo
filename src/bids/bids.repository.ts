import { DatabaseService } from "interfaces/database.interface";
import { Bid, CreateBidPayload } from "./bids.validation";

export class BidRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async createBid(userId: number, payload: CreateBidPayload) {
    const result = await this.DB.query<Bid>(
      "INSERT INTO bids (auction_id, user_id, amount) VALUES ($1, $2, $3) RETURNING *",
      [payload.auction_id, userId, payload.amount]
    );
    if (result.rows.length === 0) throw new Error("Failed to create bid");

    return result.rows[0];
  }

  public async getHighestAuctionBidAmount(auctionId: number) {
    const result = await this.DB.query<{ amount: number }>(
      "SELECT amount FROM bids WHERE auction_id = $1 ORDER BY amount DESC LIMIT 1",
      [auctionId]
    );
    if (result.rows.length === 0) return null;

    return result.rows[0];
  }
}
