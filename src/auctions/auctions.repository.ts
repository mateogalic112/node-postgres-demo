import { PaginatedRequestParams } from "api/api.validations";
import { DatabaseService } from "interfaces/database.interface";
import { Auction, CreateAuctionPayload } from "./auctions.validation";
import { User } from "users/users.validation";

export class AuctionRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async getAuctions(params: PaginatedRequestParams) {
    const result = await this.DB.query<Auction>(
      "SELECT * FROM auctions WHERE id > $1 ORDER BY id ASC LIMIT $2",
      [params.cursor ?? 0, params.limit]
    );
    return result.rows;
  }

  public async findAuctionById(id: number) {
    const result = await this.DB.query<Auction>("SELECT * FROM auctions WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  public async createAuction(user: User, payload: CreateAuctionPayload, startingPrice: number) {
    const result = await this.DB.query<Auction>(
      "INSERT INTO auctions (creator_id, product_id, start_time, duration_hours, starting_price) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [user.id, payload.product_id, payload.start_time, payload.duration_hours, startingPrice]
    );
    return result.rows[0];
  }

  public async cancelAuction(userId: number, auctionId: number) {
    const result = await this.DB.query<Auction>(
      "UPDATE auctions SET is_cancelled = TRUE WHERE id = $1 AND creator_id = $2 RETURNING *",
      [auctionId, userId]
    );
    return result.rows[0];
  }

  public async getAuctionsByProductId(productId: number) {
    const result = await this.DB.query<Auction>("SELECT * FROM auctions WHERE product_id = $1", [
      productId
    ]);
    return result.rows;
  }
}
