import { PaginatedRequestParams } from "api/api.validations";
import { AuctionRepository } from "./auctions.repository";
import { Auction, auctionSchema, CreateAuctionPayload } from "./auctions.validation";
import { BadRequestError, ForbiddenError, NotFoundError } from "api/api.errors";
import { User } from "users/users.validation";
import { addHours, isPast } from "date-fns";

export class AuctionService {
  constructor(private readonly auctionRepository: AuctionRepository) {}

  public async getAuctions(params: PaginatedRequestParams) {
    const result = await this.auctionRepository.getAuctions(params);
    return this.toAuctions(result);
  }

  public async getAuctionById(id: number) {
    const result = await this.auctionRepository.findAuctionById(id);
    if (!result) {
      throw new NotFoundError(`Auction with id ${id} not found`);
    }
    return this.toAuction(result);
  }

  public async createAuction(user: User, payload: CreateAuctionPayload) {
    const result = await this.auctionRepository.createAuction(user, payload);
    return this.toAuction(result);
  }

  public async cancelAuction(user: User, auctionId: number) {
    const updatedAuction = await this.auctionRepository.cancelAuction(user.id, auctionId);
    if (updatedAuction) {
      return this.toAuction(updatedAuction);
    }

    const foundAuction = await this.auctionRepository.findAuctionById(auctionId);
    if (!foundAuction) {
      throw new NotFoundError("Auction not found");
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

  private toAuction(data: unknown): Auction {
    return auctionSchema.parse(data);
  }

  private toAuctions(data: Array<unknown>): Array<Auction> {
    return data.map(this.toAuction);
  }

  public getAuctionRoomName(namespace: string, auctionId: number) {
    return `${namespace}-${auctionId}`;
  }
}
