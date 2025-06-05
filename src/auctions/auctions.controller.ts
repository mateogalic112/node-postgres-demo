import { Controller } from "api/api.controllers";
import { paginatedRequestSchema } from "api/api.validations";
import asyncMiddleware from "middleware/async.middleware";
import { AuctionService } from "./auctions.service";

export class AuctionsController extends Controller {
  constructor(private readonly auctionService: AuctionService) {
    super("/auctions");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}`, this.getAuctions);
  }

  private getAuctions = asyncMiddleware(async (request, response) => {
    const { limit, cursor } = paginatedRequestSchema.parse(request.query);
    const auctions = await this.auctionService.getAuctions({ limit, cursor });

    response.json({
      data: auctions,
      nextCursor: auctions.length === limit ? { id: auctions[auctions.length - 1].id } : null
    });
  });
}
