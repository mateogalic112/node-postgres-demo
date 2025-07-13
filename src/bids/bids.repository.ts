import { DatabaseService } from "interfaces/database.interface";
import { Bid, CreateBidPayload } from "./bids.validation";
import { Auction } from "auctions/auctions.validation";
import { BadRequestError, NotFoundError, PgError } from "api/api.errors";
import { PoolClient } from "pg";

export class BidRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async createBid(userId: number, payload: CreateBidPayload) {
    const client = await this.DB.connect();

    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const auction = await this.getActiveAuctionByIdWithLock(client, payload.auction_id);

      if (auction.creator_id === userId) {
        throw new BadRequestError("Auction creator cannot place bids on their own auction");
      }

      const highestBid = Math.max(
        await this.getHighestAuctionBidAmountWithLock(client, auction.id),
        auction.starting_price
      );

      this.assertMinimumBidIncrease({ auction, currentBid: payload.amount, highestBid });

      const result = await client.query<Bid>(
        "INSERT INTO bids (auction_id, user_id, amount) VALUES ($1, $2, $3) RETURNING *",
        [payload.auction_id, userId, payload.amount]
      );

      await client.query("COMMIT");

      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");

      if (PgError.isPgError(error) && (error as { code: string }).code === "40001") {
        throw new PgError("Someone has already placed a higher bid", 400);
      }

      throw error;
    } finally {
      client.release();
    }
  }

  private async getActiveAuctionByIdWithLock(client: PoolClient, auctionId: number) {
    const result = await client.query<Auction>(
      `SELECT * FROM auctions 
       WHERE id = $1 AND is_cancelled = FALSE 
       AND start_time < NOW() 
       AND start_time + duration_hours * INTERVAL '1 hour' > NOW()
       FOR UPDATE`, // Row-level lock to prevent concurrent modifications
      [auctionId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError("Auction not found or not active");
    }

    return result.rows[0];
  }

  private async getHighestAuctionBidAmountWithLock(
    client: PoolClient,
    auctionId: number
  ): Promise<number> {
    const result = await client.query<{ amount: number }>(
      `SELECT amount FROM bids 
       WHERE auction_id = $1 
       ORDER BY amount DESC 
       LIMIT 1
       FOR UPDATE`, // Lock the highest bid row to prevent race conditions
      [auctionId]
    );

    if (result.rows.length === 0) {
      return 0;
    }
    return result.rows[0].amount;
  }

  private assertMinimumBidIncrease({
    auction,
    currentBid,
    highestBid
  }: {
    auction: Auction;
    currentBid: number;
    highestBid: number;
  }) {
    //@notice: 10% of the auction starting price
    const MINIMUM_BID_INCREASE_AMOUNT = Math.round(auction.starting_price * 0.1);

    if (currentBid < highestBid + MINIMUM_BID_INCREASE_AMOUNT) {
      throw new BadRequestError(
        `Bid amount must be greater than ${highestBid + MINIMUM_BID_INCREASE_AMOUNT}`
      );
    }
  }

  public async getBidsByAuctionId(auctionId: number) {
    const result = await this.DB.query<Array<Bid>>(
      "SELECT * FROM bids WHERE auction_id = $1 ORDER BY created_at DESC",
      [auctionId]
    );
    return result.rows;
  }
}
