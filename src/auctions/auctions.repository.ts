import { PaginatedRequestParams } from "api/api.validations";
import { DatabaseService } from "interfaces/database.interface";
import { Auction, auctionSchema, CreateAuctionPayload } from "./auctions.validation";
import { BadRequestError, InternalServerError, NotFoundError } from "api/api.errors";

export class AuctionsRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async getAuctions(params: PaginatedRequestParams) {
    const result = await this.DB.query<Auction>(
      "SELECT * FROM auctions WHERE id > $1 ORDER BY id ASC LIMIT $2",
      [params.cursor ?? 0, params.limit]
    );
    return result.rows.map((data) => auctionSchema.parse(data));
  }

  public async getAuctionById(id: number) {
    const result = await this.DB.query<Auction>("SELECT * FROM auctions WHERE id = $1", [id]);
    if (!result.rows[0]) {
      throw new NotFoundError("Auction not found");
    }
    return auctionSchema.parse(result.rows[0]);
  }

  public async createAuction(userId: number, payload: CreateAuctionPayload) {
    const result = await this.DB.query<Auction>(
      "INSERT INTO auctions (creator_id, product_id, start_time, duration_hours, starting_price_in_cents) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [
        userId,
        payload.product_id,
        payload.start_time,
        payload.duration_hours,
        payload.starting_price_in_cents
      ]
    );
    if (!result.rows[0]) {
      throw new InternalServerError("Auction not created");
    }
    return auctionSchema.parse(result.rows[0]);
  }

  public async cancelAuction(auctionId: number, userId: number) {
    const result = await this.DB.query<Auction>(
      `UPDATE auctions 
       SET is_cancelled = TRUE
       WHERE id = $1 
         AND creator_id = $2 
         AND is_cancelled = FALSE 
         AND NOW() < start_time + INTERVAL '1 hour' * duration_hours
       RETURNING *`,
      [auctionId, userId]
    );
    if (!result.rows[0]) {
      throw new BadRequestError("Auction can't be cancelled");
    }
    return auctionSchema.parse(result.rows[0]);
  }

  public async getActiveAuction(auctionId: number, userId: number) {
    const result = await this.DB.query<Auction>(
      `SELECT * FROM auctions 
       WHERE id = $1 AND creator_id != $2 AND is_cancelled = FALSE 
       AND start_time < NOW() 
       AND start_time + duration_hours * INTERVAL '1 hour' > NOW()`,
      [auctionId, userId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError("Auction not active");
    }
    return auctionSchema.parse(result.rows[0]);
  }
}
