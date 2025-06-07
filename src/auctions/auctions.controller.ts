import { HttpController } from "api/api.controllers";
import { paginatedRequestSchema } from "api/api.validations";
import asyncMiddleware from "middleware/async.middleware";
import { AuctionService } from "./auctions.service";
import { createAuctionSchema } from "./auctions.validation";
import authMiddleware from "middleware/auth.middleware";
import { userSchema } from "users/users.validation";
import { formatPaginatedResponse, formatResponse } from "api/api.formats";
import { AuthService } from "auth/auth.service";

export class AuctionHttpController extends HttpController {
  constructor(
    private readonly auctionService: AuctionService,
    private readonly authService: AuthService
  ) {
    super("/auctions");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}`, this.getAuctions);
    this.router.post(`${this.path}`, authMiddleware(this.authService), this.createAuction);
  }

  private getAuctions = asyncMiddleware(async (request, response) => {
    const query = paginatedRequestSchema.parse(request.query);
    const auctions = await this.auctionService.getAuctions(query);
    response.json(formatPaginatedResponse(auctions, query.limit));
  });

  private createAuction = asyncMiddleware(async (request, response) => {
    const auction = await this.auctionService.createAuction({
      user: userSchema.parse(response.locals.user),
      payload: createAuctionSchema.parse(request.body)
    });
    response.json(formatResponse(auction));
  });
}
