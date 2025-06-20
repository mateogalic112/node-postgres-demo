import { HttpController } from "api/api.controllers";
import { BidService } from "./bids.service";
import asyncMiddleware from "middleware/async.middleware";
import { idSchema } from "api/api.validations";
import { formatResponse } from "api/api.formats";

export class BidHttpController extends HttpController {
  constructor(private readonly bidService: BidService) {
    super("/bids");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}/auctions/:id`, this.getAuctionBids);
  }

  private getAuctionBids = asyncMiddleware(async (request, response) => {
    const auctionBids = await this.bidService.getBidsByAuctionId(idSchema.parse(request.params).id);
    response.json(formatResponse(auctionBids));
  });
}
