import { Auction } from "auctions/auctions.validation";
import { CreateBidPayload } from "./bids.validation";

export class AuctionBid {
  private readonly MINIMUM_BID_INCREASE_PERCENTAGE = 10;

  constructor(
    private readonly payload: CreateBidPayload,
    private readonly auction: Auction
  ) {}

  public isBidIncreasedEnough(highestBidInCents: number) {
    const minimumAcceptableBid =
      Math.max(highestBidInCents, this.auction.starting_price_in_cents) +
      this.minimumIncreaseAmount();
    return this.payload.amount_in_cents >= minimumAcceptableBid;
  }

  public minimumIncreaseAmount() {
    return Math.round(
      this.auction.starting_price_in_cents * (this.MINIMUM_BID_INCREASE_PERCENTAGE / 100)
    );
  }
}
