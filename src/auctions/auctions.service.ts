import { PaginatedRequestParams } from "api/api.validations";
import { AuctionRepository } from "./auctions.repository";
import { auctionSchema, CreateAuctionPayload } from "./auctions.validation";
import { BadRequestError, ForbiddenError, NotFoundError } from "api/api.errors";
import { User } from "users/users.validation";
import { CreateAuctionTemplate, MailService } from "interfaces/mail.interface";
import { addHours, isPast } from "date-fns";

export class AuctionService {
  constructor(
    private readonly auctionRepository: AuctionRepository,
    private readonly mailService: MailService
  ) {}

  public async getAuctions(params: PaginatedRequestParams) {
    const auctions = await this.auctionRepository.getAuctions(params);
    return auctions.map((auction) => auctionSchema.parse(auction));
  }

  public async getAuctionById(id: number) {
    const auction = await this.auctionRepository.findAuctionById(id);
    if (!auction) {
      throw new NotFoundError(`Auction with id ${id} not found`);
    }
    return auctionSchema.parse(auction);
  }

  public async createAuction({ user, payload }: { user: User; payload: CreateAuctionPayload }) {
    const newAuction = await this.auctionRepository.createAuction(user, payload);

    this.mailService.sendEmail({
      to: user.email,
      template: CreateAuctionTemplate.getTemplate(newAuction)
    });

    return auctionSchema.parse(newAuction);
  }

  public async cancelAuction({ user, auctionId }: { user: User; auctionId: number }) {
    const updatedAuction = await this.auctionRepository.cancelAuction(user.id, auctionId);
    if (updatedAuction) {
      return auctionSchema.parse(updatedAuction);
    }

    const foundAuction = await this.auctionRepository.findAuctionById(auctionId);
    if (!foundAuction) {
      throw new NotFoundError(`Auction with id ${auctionId} not found`);
    }

    switch (true) {
      case foundAuction.creator_id !== user.id:
        throw new ForbiddenError("You are not the creator of this auction");
      case foundAuction.is_cancelled:
        throw new BadRequestError("Auction has been cancelled");
      case isPast(addHours(foundAuction.start_time, foundAuction.duration_hours)):
        throw new BadRequestError("Auction has ended");
      default:
        throw new BadRequestError("Auction not cancelled");
    }
  }

  public getAuctionRoomName(namespace: string, auctionId: number) {
    return `${namespace}-${auctionId}`;
  }
}
