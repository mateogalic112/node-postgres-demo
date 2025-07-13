import { DatabaseService } from "interfaces/database.interface";
import { Bid, CreateBidPayload } from "./bids.validation";
import { Auction } from "auctions/auctions.validation";
import { BadRequestError, NotFoundError, PgError } from "api/api.errors";
import { PoolClient } from "pg";
import { LoggerService } from "services/logger.service";
import { Money } from "money/money.model";

export class BidRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async createBid(userId: number, payload: CreateBidPayload) {
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 100;
    const TRANSACTION_TIMEOUT_MS = 10_000;

    const bidAmount = new Money(payload.amount_in_cents);
    // @dev Prevent duplicate bids for the same auction with the same amount from the same user
    const IDEMPOTENCY_KEY = `bid_${userId}_${payload.auction_id}_${bidAmount.getAmountInCents()}`;

    const START_TIME = Date.now();
    const logger = LoggerService.getInstance();

    logger.log(
      `[MONEY_BID_START] User ${userId} bidding ${bidAmount.getFormattedAmount()} on auction ${payload.auction_id} at ${START_TIME} [Key: ${IDEMPOTENCY_KEY}]`
    );

    // @dev We need to retry the transaction if it fails due to serialization failure or deadlock detected
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // @dev You must use the same client instance for all statements within a transaction!
      // @link https://node-postgres.com/features/transactions
      const client = await this.DB.connect();

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

        const auction = await this.getBiddingAuction(client, payload.auction_id, userId);

        const highestBid = new Money(
          Math.max(
            await this.getHighestBidAmountForAuction(client, auction.id),
            auction.starting_price
          )
        );
        logger.log(
          `[MONEY_BID_VALIDATION] Auction ${payload.auction_id}: current_highest=$${highestBid.getFormattedAmount()}, attempt=$${bidAmount.getFormattedAmount()} [Key: ${IDEMPOTENCY_KEY}]`
        );

        this.assertMinimumBidIncrease({ auction, bidAmount, highestBid });

        const result = await client.query<Bid>(
          `INSERT INTO bids (auction_id, user_id, amount_in_cents, idempotency_key, created_at) 
           VALUES ($1, $2, $3, $4, NOW()) 
           RETURNING *`,
          [payload.auction_id, userId, payload.amount_in_cents, IDEMPOTENCY_KEY]
        );

        await client.query("COMMIT");
        if (timeoutHandle) clearTimeout(timeoutHandle);

        const duration = Date.now() - START_TIME;
        logger.log(
          `[MONEY_BID_SUCCESS] User ${userId} successfully bid $${bidAmount.getFormattedAmount()} on auction ${payload.auction_id} in ${duration}ms (attempt ${attempt + 1}/${MAX_RETRIES}) [Key: ${IDEMPOTENCY_KEY}]`
        );

        return result.rows[0];
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
          `[MONEY_BID_ERROR] User ${userId} failed to bid $${bidAmount.getFormattedAmount()} on auction ${payload.auction_id} after ${Date.now() - START_TIME}ms: ${error instanceof Error ? error.message : String(error)} [Key: ${IDEMPOTENCY_KEY}]`
        );

        throw error;
      } finally {
        client.release();
      }
    }

    logger.error(
      `[MONEY_BID_EXHAUSTED] All retry attempts exhausted for user ${userId} bidding $${bidAmount.getFormattedAmount()} on auction ${payload.auction_id} [Key: ${IDEMPOTENCY_KEY}]`
    );
    throw new PgError("Unable to place bid due to high system load. Please try again.", 503);
  }

  private async getBiddingAuction(client: PoolClient, auctionId: number, userId: number) {
    const result = await client.query<Auction>(
      `SELECT * FROM auctions 
       WHERE id = $1 AND creator_id != $2 AND is_cancelled = FALSE 
       AND start_time < NOW() 
       AND start_time + duration_hours * INTERVAL '1 hour' > NOW()
       FOR UPDATE NOWAIT`,
      [auctionId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError("Auction not found");
    }

    return result.rows[0];
  }

  private async getHighestBidAmountForAuction(
    client: PoolClient,
    auctionId: number
  ): Promise<number> {
    const result = await client.query<{ amount_in_cents: number }>(
      `SELECT amount_in_cents FROM bids 
       WHERE auction_id = $1 
       ORDER BY amount_in_cents DESC 
       LIMIT 1
       FOR UPDATE NOWAIT`,
      [auctionId]
    );

    if (result.rows.length === 0) {
      return 0;
    }

    return result.rows[0].amount_in_cents;
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
    const result = await this.DB.query<Array<Bid>>(
      "SELECT * FROM bids WHERE auction_id = $1 ORDER BY created_at DESC",
      [auctionId]
    );
    return result.rows;
  }
}
