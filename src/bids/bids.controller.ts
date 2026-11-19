import { HttpController } from "api/api.controllers";
import { BidsService } from "./bids.service";
import asyncMiddleware from "middleware/async.middleware";
import { idSchema } from "api/api.validations";
import { formatResponse } from "api/api.formats";

export class BidsHttpController extends HttpController {
  constructor(private readonly bidsService: BidsService) {
    super("/bids");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}/auctions/:id`, this.getAuctionBids);
  }

  private getAuctionBids = asyncMiddleware(async (request, response) => {
    const { id: auctionId } = idSchema.parse(request.params);
    const auctionBids = await this.bidsService.getAuctionBids(auctionId);
    response.json(formatResponse(auctionBids));
  });
}
