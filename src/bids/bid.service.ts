import { AuctionService } from "auctions/auctions.service";
import { BidRepository } from "./bids.repository";
import { bidSchema, CreateBidPayload } from "./bids.validation";
import { BadRequestError } from "api/api.errors";
import { User } from "users/users.validation";
import { Auction } from "auctions/auctions.validation";

export class BidService {
  constructor(
    private readonly bidRepository: BidRepository,
    private readonly auctionService: AuctionService
  ) {}

  public async createBid(user: User, payload: CreateBidPayload) {
    const auction = await this.auctionService.getAuctionById(payload.auction_id);
    if (auction.creator_id === user.id) {
      throw new BadRequestError("You cannot bid on your own auction");
    }

    this.auctionService.assertAuctionIsActive(auction);
    await this.assertMinimumBidIncrease(auction, payload.amount);

    const newBid = await this.bidRepository.createBid(user.id, payload);
    return bidSchema.parse(newBid);
  }

  private async assertMinimumBidIncrease(auction: Auction, currentBid: number) {
    //@notice: 10% of the auction starting price
    const MINIMUM_BID_INCREASE_AMOUNT = Math.round(auction.starting_price * 0.1);

    const highestBid = Math.max(
      await this.bidRepository.getHighestAuctionBidAmount(auction.id),
      auction.starting_price
    );

    if (currentBid < highestBid + MINIMUM_BID_INCREASE_AMOUNT) {
      throw new BadRequestError(
        `Bid amount must be greater than ${highestBid + MINIMUM_BID_INCREASE_AMOUNT}`
      );
    }
  }
}
