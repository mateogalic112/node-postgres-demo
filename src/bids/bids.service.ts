import { BidsRepository } from "./bids.repository";
import { CreateBidPayload } from "./bids.validation";
import { BadRequestError } from "api/api.errors";
import { DatabaseService } from "interfaces/database.interface";
import { Currency } from "money/currency";
import { AuctionBid } from "./bids.model";
import { AuctionsRepository } from "auctions/auctions.repository";

export class BidsService {
  constructor(
    private readonly bidsRepository: BidsRepository,
    private readonly auctionsRepository: AuctionsRepository,
    private readonly DB: DatabaseService
  ) {}

  public async createBid(userId: number, payload: CreateBidPayload) {
    return this.DB.withTransaction(async (client) => {
      const idempotencyKey = `bid_${userId}_${payload.auction_id}_${payload.amount_in_cents}`;

      await client.query(
        "BEGIN; SET LOCAL lock_timeout = '1s'; SET LOCAL statement_timeout = '2s'"
      );

      // @dev Locking the auction row serializes all bids per auction, so the highest bid read below can't go stale
      const auction = await this.auctionsRepository.lockActiveAuction(
        client,
        payload.auction_id,
        userId
      );

      const existingBid = await this.bidsRepository.findBidByIdempotencyKey(client, idempotencyKey);
      if (existingBid) {
        await client.query("COMMIT");
        return existingBid;
      }

      const auctionBid = new AuctionBid(payload, auction);
      const highestBidInCents = await this.bidsRepository.getHighestBidAmountForAuction(
        client,
        auction.id
      );

      if (!auctionBid.isBidIncreasedEnough(highestBidInCents)) {
        throw new BadRequestError(
          `Bid must be at least ${Currency.formatAmount(auctionBid.minimumIncreaseAmount())}`
        );
      }

      return this.bidsRepository.save(client, userId, payload, idempotencyKey);
    });
  }
}
