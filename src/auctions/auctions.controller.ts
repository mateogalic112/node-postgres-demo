import { Controller } from "api/api.controllers";
import { paginatedRequestSchema } from "api/api.validations";
import asyncMiddleware from "middleware/async.middleware";
import { AuctionService } from "./auctions.service";
import { createAuctionSchema } from "./auctions.validation";
import { DatabaseService } from "interfaces/database.interface";
import { UsersRepository } from "users/users.repository";
import authMiddleware from "middleware/auth.middleware";
import { userSchema } from "users/users.validation";
import { CreateAuctionTemplate, MailService } from "interfaces/mail.interface";

export class AuctionController extends Controller {
  constructor(
    private readonly DB: DatabaseService,
    private readonly auctionService: AuctionService,
    private readonly mailService: MailService
  ) {
    super("/auctions");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}`, this.getAuctions);
    this.router.post(
      `${this.path}`,
      authMiddleware(new UsersRepository(this.DB)),
      this.createAuction
    );
  }

  private getAuctions = asyncMiddleware(async (request, response) => {
    const { limit, cursor } = paginatedRequestSchema.parse(request.query);
    const auctions = await this.auctionService.getAuctions({ limit, cursor });

    response.json({
      data: auctions,
      nextCursor: auctions.length === limit ? { id: auctions[auctions.length - 1].id } : null
    });
  });

  private createAuction = asyncMiddleware(async (request, response) => {
    const user = userSchema.parse(response.locals.user);

    const { auction, product } = await this.auctionService.createAuction(
      createAuctionSchema.parse(request.body),
      user.id
    );

    this.mailService.sendEmail({
      to: user.email,
      template: CreateAuctionTemplate.getTemplate(auction, product)
    });

    response.json({ data: auction });
  });
}
