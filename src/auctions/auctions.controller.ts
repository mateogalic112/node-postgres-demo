import { HttpController } from "api/api.controllers";
import { idSchema, paginatedRequestSchema } from "api/api.validations";
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
    this.router.get(`${this.path}/:id`, this.getAuctionById);
    this.router.post(`${this.path}`, authMiddleware(this.authService), this.createAuction);
    this.router.patch(
      `${this.path}/:id/cancel`,
      authMiddleware(this.authService),
      this.cancelAuction
    );
  }

  private getAuctions = asyncMiddleware(async (request, response) => {
    const query = paginatedRequestSchema.parse(request.query);
    const auctions = await this.auctionService.getAuctions(query);
    response.json(formatPaginatedResponse(auctions, query.limit));
  });

  private getAuctionById = asyncMiddleware(async (request, response) => {
    const { id: auctionId } = idSchema.parse(request.params);
    const auction = await this.auctionService.getAuctionById(auctionId);
    response.json(formatResponse(auction));
  });

  private createAuction = asyncMiddleware(async (request, response) => {
    const auction = await this.auctionService.createAuction({
      user: userSchema.parse(response.locals.user),
      payload: createAuctionSchema.parse(request.body)
    });
    response.status(201).json(formatResponse(auction));
  });

  private cancelAuction = asyncMiddleware(async (request, response) => {
    const { id: auctionId } = idSchema.parse(request.params);
    const auction = await this.auctionService.cancelAuction({
      user: userSchema.parse(response.locals.user),
      auctionId
    });
    response.json(formatResponse(auction));
  });
}
