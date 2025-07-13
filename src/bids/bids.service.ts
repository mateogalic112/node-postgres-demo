import { BidRepository } from "./bids.repository";
import { bidSchema, CreateBidPayload } from "./bids.validation";
import { User } from "users/users.validation";

export class BidService {
  constructor(private readonly bidRepository: BidRepository) {}

  public async createBid(user: User, payload: CreateBidPayload) {
    const newBid = await this.bidRepository.createBid(user.id, payload);
    return bidSchema.parse(newBid);
  }

  public async getBidsByAuctionId(auctionId: number) {
    const auctionBids = await this.bidRepository.getBidsByAuctionId(auctionId);
    return auctionBids.map((bid) => bidSchema.parse(bid));
  }
}
