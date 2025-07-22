import { LoggerService } from "services/logger.service";
import { BidRepository } from "./bids.repository";
import { bidSchema, CreateBidPayload } from "./bids.validation";
import { User } from "users/users.validation";
import { Money } from "money/money.model";
import { BadRequestError, PgError } from "api/api.errors";
import { Auction } from "auctions/auctions.validation";
import { DatabaseService } from "interfaces/database.interface";

export class BidService {
  constructor(
    private readonly bidRepository: BidRepository,
    private readonly databaseService: DatabaseService
  ) {}

  public async createBid(user: User, payload: CreateBidPayload) {
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 100;
    const TRANSACTION_TIMEOUT_MS = 10_000;

    const START_TIME = Date.now();
    const logger = LoggerService.getInstance();

    const bidAmount = new Money(payload.amount_in_cents);
    const idempotencyKey = `bid_${user.id}_${payload.auction_id}_${bidAmount.getAmountInCents()}`;

    logger.log(
      `[MONEY_BID_START] User ${user.id} bidding ${bidAmount.getFormattedAmount()} on auction ${payload.auction_id} at ${START_TIME} [Key: ${idempotencyKey}]`
    );

    // @dev Retry the transaction if it fails due to serialization failure or deadlock detected
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // @dev MUST use the same client instance for all statements within a transaction!
      // @link https://node-postgres.com/features/transactions
      const client = await this.databaseService.getClient();

      // @dev Set transaction timeout to prevent indefinite blocking
      let transactionTimeout: NodeJS.Timeout | undefined;

      try {
        // @dev Set transaction timeout to prevent indefinite blocking
        transactionTimeout = setTimeout(() => {
          LoggerService.getInstance().error(
            `[MONEY_BID_TIMEOUT] Transaction timeout after ${TRANSACTION_TIMEOUT_MS}ms [Key: ${idempotencyKey}]`
          );
          client.query("ROLLBACK").catch(() => {});
          client.release();
        }, TRANSACTION_TIMEOUT_MS);

        // @dev SERIALIZABLE isolation for maximum consistency (required for real money)
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");

        const biddingAuction = await this.bidRepository.getBiddingAuction(
          client,
          payload.auction_id,
          user.id
        );

        const highestBid = new Money(
          Math.max(
            biddingAuction.starting_price_in_cents,
            await this.bidRepository.getHighestBidAmountForAuction(client, biddingAuction.id)
          )
        );

        this.assertMinimumBidIncrease({ auction: biddingAuction, bidAmount, highestBid });

        const newBid = await this.bidRepository.createBid(client, user.id, payload, idempotencyKey);

        await client.query("COMMIT");

        if (transactionTimeout) {
          clearTimeout(transactionTimeout);
        }

        logger.log(
          `[MONEY_BID_SUCCESS] User ${user.id} successfully bid $${bidAmount.getFormattedAmount()} on auction ${payload.auction_id} in ${Date.now() - START_TIME}ms (attempt ${attempt + 1}/${MAX_RETRIES}) [Key: ${idempotencyKey}]`
        );

        return bidSchema.parse(newBid);
      } catch (error) {
        if (transactionTimeout) {
          clearTimeout(transactionTimeout);
        }

        await client.query("ROLLBACK");

        if (PgError.isSerializationFailure(error) || PgError.isDeadlockDetected(error)) {
          if (attempt < MAX_RETRIES - 1) {
            const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
            logger.log(
              `[MONEY_BID_RETRY] Serialization failure, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES}) [Key: ${idempotencyKey}]`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          } else {
            logger.error(
              `[MONEY_BID_EXHAUSTED] All retry attempts exhausted for user ${user.id} bidding $${bidAmount.getFormattedAmount()} on auction ${payload.auction_id} [Key: ${idempotencyKey}]`
            );
            throw new PgError(
              "Unable to place bid due to high system load. Please try again.",
              503
            );
          }
        }

        // @dev Handle all other errors - fail and log
        logger.error(
          `[MONEY_BID_ERROR] User ${user.id} failed to bid $${bidAmount.getFormattedAmount()} on auction ${payload.auction_id} after ${Date.now() - START_TIME}ms: ${error instanceof Error ? error.message : String(error)} [Key: ${idempotencyKey}]`
        );
        throw error;
      } finally {
        client.release();
      }
    }

    logger.error(
      `[MONEY_BID_EXHAUSTED] All retry attempts exhausted for user ${user.id} bidding $${bidAmount.getFormattedAmount()} on auction ${payload.auction_id} [Key: ${idempotencyKey}]`
    );
    throw new PgError("Unable to place bid due to high system load. Please try again.", 503);
  }

  private assertMinimumBidIncrease({
    auction,
    bidAmount,
    highestBid
  }: {
    auction: Auction;
    bidAmount: Money;
    highestBid: Money;
  }) {
    const MINIMUM_BID_INCREASE_AMOUNT = Math.round(auction.starting_price_in_cents * 0.1); // 10% of starting price
    const minimumAcceptableBid = new Money(
      highestBid.getAmountInCents() + MINIMUM_BID_INCREASE_AMOUNT
    );

    if (bidAmount.getAmountInCents() < minimumAcceptableBid.getAmountInCents()) {
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
