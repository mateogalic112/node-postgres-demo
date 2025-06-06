import { PaginatedRequestParams } from "api/api.validations";
import { DatabaseService } from "interfaces/database.interface";
import { Auction, auctionSchema, CreateAuctionPayload } from "./auctions.validation";

export class AuctionRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async getAuctions(params: PaginatedRequestParams) {
    const result = await this.DB.query<Auction>(
      "SELECT * FROM auctions WHERE id > $1 ORDER BY id ASC LIMIT $2",
      [params.cursor ?? 0, params.limit]
    );
    return result.rows;
  }

  public async getAuctionByProductId(productId: number) {
    const result = await this.DB.query<Auction>("SELECT * FROM auctions WHERE product_id = $1", [
      productId
    ]);
    if (result.rows.length === 0) return null;

    return auctionSchema.parse(result.rows[0]);
  }

  public async createAuction(payload: CreateAuctionPayload, startingPrice: number) {
    const result = await this.DB.query<Auction>(
      "INSERT INTO auctions (product_id, start_time, duration_hours, starting_price) VALUES ($1, $2, $3, $4) RETURNING *",
      [payload.product_id, payload.start_time, payload.duration_hours, startingPrice]
    );
    return result.rows[0];
  }
}
