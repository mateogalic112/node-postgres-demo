import { HttpController } from "api/api.controllers";
import asyncMiddleware from "middleware/async.middleware";
import { idSchema } from "api/api.validations";
import { formatResponse } from "api/api.formats";
import { BidsRepository } from "./bids.repository";

export class BidsHttpController extends HttpController {
  constructor(private readonly bidsRepository: BidsRepository) {
    super("/bids");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}/auctions/:id`, this.getAuctionBids);
  }

  private getAuctionBids = asyncMiddleware(async (request, response) => {
    const { id: auctionId } = idSchema.parse(request.params);
    const auctionBids = await this.bidsRepository.getAuctionBids(auctionId);
    response.json(formatResponse(auctionBids));
  });
}
