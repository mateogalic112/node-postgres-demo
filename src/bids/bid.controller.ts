import { HttpController } from "api/api.controllers";
import { BidService } from "./bid.service";
import authMiddleware from "middleware/auth.middleware";
import { formatResponse } from "api/api.formats";
import asyncMiddleware from "middleware/async.middleware";
import { createBidSchema } from "./bids.validation";
import { userSchema } from "users/users.validation";
import { AuthService } from "auth/auth.service";

export class BidHttpController extends HttpController {
  constructor(
    private readonly bidService: BidService,
    private readonly authService: AuthService
  ) {
    super("/bids");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(`${this.path}`, authMiddleware(this.authService), this.createBid);
  }

  private createBid = asyncMiddleware(async (request, response) => {
    const bid = await this.bidService.createBid(
      userSchema.parse(response.locals.user),
      createBidSchema.parse(request.body)
    );
    response.json(formatResponse(bid));
  });
}
