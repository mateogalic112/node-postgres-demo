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
    const idempotencyKey = `bid_${userId}_${payload.auction_id}_${payload.amount_in_cents}`;

    return this.DB.withTransaction(async (client) => {
      // @dev Lock/statement timeouts surface as DatabaseError and are mapped to 409 "busy" in api.errors
      await client.query("SET LOCAL lock_timeout = '1s'; SET LOCAL statement_timeout = '2s'");

      // @dev Checked before the auction lock so a retried bid succeeds even after the auction closes
      const existingBid = await this.bidsRepository.findBidByIdempotencyKey(client, idempotencyKey);
      if (existingBid) {
        return existingBid;
      }

      // @dev Locking the auction row serializes all bids per auction, so the reads below can't go stale
      const auction = await this.auctionsRepository.lockActiveAuction(
        client,
        payload.auction_id,
        userId
      );

      // @dev Re-check under the lock: a concurrent duplicate may have committed while we waited
      const bidCreatedWhileWaiting = await this.bidsRepository.findBidByIdempotencyKey(
        client,
        idempotencyKey
      );
      if (bidCreatedWhileWaiting) {
        return bidCreatedWhileWaiting;
      }

      const highestBidInCents = await this.bidsRepository.getHighestBidAmountForAuction(
        client,
        auction.id
      );

      const auctionBid = new AuctionBid(payload, auction);
      if (!auctionBid.isBidIncreasedEnough(highestBidInCents)) {
        const minimumBid = auctionBid.minimumAcceptableBid(highestBidInCents);
        throw new BadRequestError(`Bid must be at least ${Currency.formatAmount(minimumBid)}`);
      }

      return this.bidsRepository.save(client, userId, payload, idempotencyKey);
    });
  }
}
