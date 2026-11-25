import { Auction } from "auctions/auctions.validation";

export class AuctionsMailer {
  public static createAuctionTemplate(auction: Auction) {
    return {
      subject: "New auction created",
      html: `<strong>New auction created</strong> Starting price: ${auction.starting_price_in_cents}</p><p>Start time: ${auction.start_time}</p><p>Duration: ${auction.duration_hours} hours</p>`
    };
  }
}
