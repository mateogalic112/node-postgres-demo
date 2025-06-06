import { Controller } from "api/api.controllers";
import { BidService } from "./bid.service";
import authMiddleware from "middleware/auth.middleware";
import { UserService } from "users/users.service";
import { formatResponse } from "api/api.formats";
import asyncMiddleware from "middleware/async.middleware";
import { createBidSchema } from "./bids.validation";
import { userSchema } from "users/users.validation";

export class BidController extends Controller {
  constructor(
    private readonly bidService: BidService,
    private readonly usersService: UserService
  ) {
    super("/bids");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(`${this.path}`, authMiddleware(this.usersService), this.createBid);
  }

  private createBid = asyncMiddleware(async (request, response) => {
    const bid = await this.bidService.createBid(
      userSchema.parse(response.locals.user),
      createBidSchema.parse(request.body)
    );
    response.json(formatResponse(bid));
  });
}
