import { PaginatedRequestParams } from "api/api.validations";
import { AuctionRepository } from "./auctions.repository";
import { auctionSchema, CreateAuctionPayload } from "./auctions.validation";
import { NotFoundError } from "api/api.errors";
import { User } from "users/users.validation";
import { CreateAuctionTemplate, MailService } from "interfaces/mail.interface";

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
    return auctionSchema.parse(updatedAuction);
  }

  public getAuctionRoomName(namespace: string, auctionId: number) {
    return `${namespace}-${auctionId}`;
  }
}
