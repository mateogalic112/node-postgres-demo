import { PaginatedRequestParams } from "api/api.validations";
import { AuctionsRepository } from "./auctions.repository";
import { Auction, auctionSchema, CreateAuctionPayload } from "./auctions.validation";
import { BadRequestError, ForbiddenError, NotFoundError } from "api/api.errors";
import { DatabaseUser } from "users/users.validation";
import { addHours, isPast } from "date-fns";

export class AuctionsService {
  constructor(private readonly auctionsRepository: AuctionsRepository) {}

  public async getAuctions(params: PaginatedRequestParams) {
    const result = await this.auctionsRepository.getAuctions(params);
    return this.toAuctions(result);
  }

  public async getAuctionById(id: number) {
    const result = await this.auctionsRepository.findAuctionById(id);
    if (!result) {
      throw new NotFoundError(`Auction with id ${id} not found`);
    }
    return this.toAuction(result);
  }

  public async createAuction(user: DatabaseUser, payload: CreateAuctionPayload) {
    const result = await this.auctionsRepository.createAuction(user, payload);
    return this.toAuction(result);
  }

  public async cancelAuction(user: DatabaseUser, auctionId: number) {
    const updatedAuction = await this.auctionsRepository.cancelAuction(user, auctionId);
    if (updatedAuction) {
      return this.toAuction(updatedAuction);
    }

    const foundAuction = await this.auctionsRepository.findAuctionById(auctionId);
    if (!foundAuction) {
      throw new NotFoundError("Auction not found");
    }
    if (foundAuction.creator_id !== user.id) {
      throw new ForbiddenError("You are not the creator of this auction");
    }
    if (foundAuction.is_cancelled) {
      throw new BadRequestError("Auction has already been cancelled");
    }
    if (isPast(addHours(foundAuction.start_time, foundAuction.duration_hours))) {
      throw new BadRequestError("Auction has ended");
    }
    throw new BadRequestError("Auction not cancelled");
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
