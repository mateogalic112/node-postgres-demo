import { PaginatedRequestParams } from "api/api.validations";
import { DatabaseService } from "interfaces/database.interface";
import { Auction } from "./auctions.validation";

export class AuctionRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async getAuctions(params: PaginatedRequestParams) {
    const result = await this.DB.query<Auction>(
      "SELECT * FROM auctions WHERE id > $1 ORDER BY id ASC LIMIT $2",
      [params.cursor ?? 0, params.limit]
    );
    return result.rows;
  }

  //   public async createAuction(payload: CreateAuctionPayload) {
  //     const result = await this.DB.query<Auction>(
  //       "INSERT INTO auctions (product_id, start_time, duration_hours, starting_price) VALUES ($1, $2, $3, $4) RETURNING *",
  //       [payload.product_id, payload.start_time, payload.duration_hours, payload.starting_price]
  //     );
  //     return result.rows[0];
  //   }
}
