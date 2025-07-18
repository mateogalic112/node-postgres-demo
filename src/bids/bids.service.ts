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

    const bidAmount = new Money(payload.amount_in_cents);
    // @dev Prevent duplicate bids for the same auction with the same amount from the same user
    const IDEMPOTENCY_KEY = `bid_${user.id}_${payload.auction_id}_${bidAmount.getAmountInCents()}`;

    const logger = LoggerService.getInstance();
    logger.log(
      `[MONEY_BID_START] User ${user.id} bidding ${bidAmount.getFormattedAmount()} on auction ${payload.auction_id} at ${START_TIME} [Key: ${IDEMPOTENCY_KEY}]`
    );

    // @dev We need to retry the transaction if it fails due to serialization failure or deadlock detected
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // @dev You must use the same client instance for all statements within a transaction!
      // @link https://node-postgres.com/features/transactions
      const client = await this.databaseService.getClient();

      // @dev Set transaction timeout to prevent indefinite blocking
      let timeoutHandle: NodeJS.Timeout | undefined;

      try {
        timeoutHandle = setTimeout(() => {
          LoggerService.getInstance().error(
            `[MONEY_BID_TIMEOUT] Transaction timeout after ${TRANSACTION_TIMEOUT_MS}ms [Key: ${IDEMPOTENCY_KEY}]`
          );
          client.query("ROLLBACK").catch(() => {});
          client.release();
        }, TRANSACTION_TIMEOUT_MS);

        // @dev SERIALIZABLE isolation for maximum consistency (required for real money)
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");

        const auction = await this.bidRepository.getBiddingAuction(
          client,
          payload.auction_id,
          user.id
        );

        const highestBid = new Money(
          await this.bidRepository.getHighestBidAmountForAuction(client, auction.id)
        );
        logger.log(
          `[MONEY_BID_VALIDATION] Auction ${payload.auction_id}: current_highest=$${highestBid.getFormattedAmount()}, attempt=$${bidAmount.getFormattedAmount()} [Key: ${IDEMPOTENCY_KEY}]`
        );

        this.assertMinimumBidIncrease({ auction, bidAmount, highestBid });

        const newBid = await this.bidRepository.createBid(
          client,
          user.id,
          payload,
          IDEMPOTENCY_KEY
        );

        await client.query("COMMIT");
        if (timeoutHandle) clearTimeout(timeoutHandle);

        logger.log(
          `[MONEY_BID_SUCCESS] User ${user.id} successfully bid $${bidAmount.getFormattedAmount()} on auction ${payload.auction_id} in ${Date.now() - START_TIME}ms (attempt ${attempt + 1}/${MAX_RETRIES}) [Key: ${IDEMPOTENCY_KEY}]`
        );

        return bidSchema.parse(newBid);
      } catch (error) {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        await client.query("ROLLBACK");

        if (attempt < MAX_RETRIES - 1) {
          if (PgError.isSerializationFailure(error) || PgError.isDeadlockDetected(error)) {
            const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
            logger.log(
              `[MONEY_BID_RETRY] Serialization failure, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES}) [Key: ${IDEMPOTENCY_KEY}]`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }

        if (PgError.isSerializationFailure(error)) {
          const errorMessage = "High bidding activity detected. Please try again.";
          logger.error(
            `[MONEY_BID_SERIALIZATION_EXHAUSTED] ${errorMessage} [Key: ${IDEMPOTENCY_KEY}]`
          );
          throw new PgError(errorMessage, 409);
        }

        if (PgError.isUniqueViolation(error)) {
          const errorMessage = "Bid already exists. Please try again.";
          logger.error(`[MONEY_BID_DUPLICATE] ${errorMessage} [Key: ${IDEMPOTENCY_KEY}]`);
          throw new PgError(errorMessage, 409);
        }

        logger.error(
          `[MONEY_BID_ERROR] User ${user.id} failed to bid $${bidAmount.getFormattedAmount()} on auction ${payload.auction_id} after ${Date.now() - START_TIME}ms: ${error instanceof Error ? error.message : String(error)} [Key: ${IDEMPOTENCY_KEY}]`
        );

        throw error;
      } finally {
        client.release();
      }
    }

    logger.error(
      `[MONEY_BID_EXHAUSTED] All retry attempts exhausted for user ${user.id} bidding $${bidAmount.getFormattedAmount()} on auction ${payload.auction_id} [Key: ${IDEMPOTENCY_KEY}]`
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
    const MINIMUM_BID_INCREASE_AMOUNT = Math.round(auction.starting_price * 0.1); // 10% of starting price
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
