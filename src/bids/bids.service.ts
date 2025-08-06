import { LoggerService } from "services/logger.service";
import { BidRepository } from "./bids.repository";
import { bidSchema, CreateBidPayload } from "./bids.validation";
import { User } from "users/users.validation";
import { Money } from "money/money.model";
import { BadRequestError, InternalServerError } from "api/api.errors";
import { DatabaseService } from "interfaces/database.interface";
import { PgError } from "database/errors";

export class BidService {
  private readonly MINIMUM_BID_INCREASE_PERCENTAGE = 10;

  constructor(
    private readonly bidRepository: BidRepository,
    private readonly DB: DatabaseService,
    private readonly logger: LoggerService
  ) {}

  public async createBid(user: User, payload: CreateBidPayload) {
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 100;
    const QUERY_STATEMENT_TIMEOUT_MS = 10_000;

    const idempotencyKey = `bid_${user.id}_${payload.auction_id}_${payload.amount_in_cents}`;

    // @dev Retry the transaction if it fails due to serialization failure or deadlock detected
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // @dev MUST use the same client instance for all statements within a transaction!
      // @link https://node-postgres.com/features/transactions
      const client = await this.DB.getClient();

      try {
        // @dev Set client query timeout to prevent indefinite blocking
        await client.query(`SET statement_timeout = ${QUERY_STATEMENT_TIMEOUT_MS}`);

        // @dev SERIALIZABLE isolation for maximum consistency (required for real money)
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");

        const auction = await this.bidRepository.getBiddingAuction(
          client,
          payload.auction_id,
          user.id
        );
        const highestBidInCents = await this.bidRepository.getHighestBidAmountForAuction(
          client,
          auction.id
        );
        this.assertAuctionMinimumBidIncrease({
          currentBidInCents: payload.amount_in_cents,
          startingPriceInCents: auction.starting_price_in_cents,
          highestBidInCents
        });

        const newBid = await this.bidRepository.createBid(client, user.id, payload, idempotencyKey);

        await client.query("COMMIT");

        return bidSchema.parse(newBid);
      } catch (error) {
        await client.query("ROLLBACK");

        if (PgError.isSerializationFailure(error) || PgError.isDeadlockDetected(error)) {
          if (attempt < MAX_RETRIES - 1) {
            const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
            this.logger.log(
              `[MONEY_BID_RETRY] Serialization failure, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES}) [Key: ${idempotencyKey}]`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }

        throw error;
      } finally {
        client.release();
      }
    }

    throw new InternalServerError("Unable to place bid due to high system load. Please try again.");
  }

  private assertAuctionMinimumBidIncrease({
    currentBidInCents,
    startingPriceInCents,
    highestBidInCents
  }: {
    currentBidInCents: number;
    startingPriceInCents: number;
    highestBidInCents: number;
  }) {
    const minimumBidIncreaseAmount = Math.round(
      startingPriceInCents * (this.MINIMUM_BID_INCREASE_PERCENTAGE / 100)
    );
    const minimumAcceptableBid = new Money(
      Math.max(highestBidInCents, startingPriceInCents) + minimumBidIncreaseAmount
    );

    if (currentBidInCents < minimumAcceptableBid.getAmountInCents()) {
      throw new BadRequestError(
        `Bid must be at least ${minimumAcceptableBid.getFormattedAmount()}`
      );
    }
  }

  public async getBidsByAuctionId(auctionId: number) {
    const auctionBids = await this.bidRepository.getBidsByAuctionId(auctionId);
    return auctionBids.map((bid) => bidSchema.parse(bid));
  }
}
