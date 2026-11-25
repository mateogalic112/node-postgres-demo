import { HttpController } from "api/api.controllers";
import { idSchema, paginatedRequestSchema } from "api/api.validations";
import asyncMiddleware from "middleware/async.middleware";
import { createAuctionSchema } from "./auctions.validation";
import authMiddleware from "middleware/auth.middleware";
import { userSchema } from "users/users.validation";
import { formatPaginatedResponse, formatResponse } from "api/api.formats";
import { MailService } from "interfaces/mail.interface";
import { UsersRepository } from "users/users.repository";
import { AuctionsRepository } from "./auctions.repository";
import { AuctionsMailer } from "./auctions.mailer";

export class AuctionsHttpController extends HttpController {
  constructor(
    private readonly auctionsRepository: AuctionsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly mailService: MailService
  ) {
    super("/auctions");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}`, this.getAuctions);
    this.router.get(`${this.path}/:id`, this.getAuctionById);
    this.router.post(`${this.path}`, authMiddleware(this.usersRepository), this.createAuction);
    this.router.patch(
      `${this.path}/:id/cancel`,
      authMiddleware(this.usersRepository),
      this.cancelAuction
    );
  }

  private getAuctions = asyncMiddleware(async (request, response) => {
    const query = paginatedRequestSchema.parse(request.query);
    const auctions = await this.auctionsRepository.getAuctions(query);
    response.json(formatPaginatedResponse(auctions, query.limit));
  });

  private getAuctionById = asyncMiddleware(async (request, response) => {
    const { id: auctionId } = idSchema.parse(request.params);
    const auction = await this.auctionsRepository.getAuctionById(auctionId);
    response.json(formatResponse(auction));
  });

  private createAuction = asyncMiddleware(async (request, response) => {
    const user = userSchema.parse(response.locals.user);
    const payload = createAuctionSchema.parse(request.body);
    const auction = await this.auctionsRepository.createAuction(user.id, payload);
    await this.mailService.sendEmail({
      to: user.email,
      ...AuctionsMailer.createAuctionTemplate(auction)
    });
    response.status(201).json(formatResponse(auction));
  });

  private cancelAuction = asyncMiddleware(async (request, response) => {
    const { id: auctionId } = idSchema.parse(request.params);
    const user = userSchema.parse(response.locals.user);
    const auction = await this.auctionsRepository.cancelAuction(auctionId, user.id);
    response.json(formatResponse(auction));
  });
}
