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

    const START_TIME = Date.now();

    const bidAmount = new Money(payload.amount);
    // Generate idempotency key for this bid attempt
    const IDEMPOTENCY_KEY = `bid_${userId}_${payload.auction_id}_${bidAmount.getFormattedAmount()}_${Date.now()}`;

    const logger = LoggerService.getInstance();
    logger.log(
      `[MONEY_BID_START] User ${userId} bidding ${bidAmount.getFormattedAmount()} on auction ${payload.auction_id} [Key: ${IDEMPOTENCY_KEY}]`
    );

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const canTryAgain = attempt < MAX_RETRIES - 1;

      const client = await this.DB.connect();
      let timeoutHandle: NodeJS.Timeout | undefined;

      try {
        // Set transaction timeout to prevent indefinite blocking
        timeoutHandle = setTimeout(() => {
          LoggerService.getInstance().error(
            `[MONEY_BID_TIMEOUT] Transaction timeout after ${TRANSACTION_TIMEOUT_MS}ms [Key: ${IDEMPOTENCY_KEY}]`
          );
          client.query("ROLLBACK").catch(() => {});
          client.release();
        }, TRANSACTION_TIMEOUT_MS);

        // SERIALIZABLE isolation for maximum consistency (required for real money)
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");

        // Check for duplicate bid (idempotency protection)
        const existingBid = await this.checkForDuplicateBid(client, userId, payload);
        if (existingBid) {
          logger.log(`[MONEY_BID_DUPLICATE] Returning existing bid [Key: ${IDEMPOTENCY_KEY}]`);
          await client.query("COMMIT");
          return existingBid;
        }

        const auction = await this.getActiveAuctionByIdWithLock(client, payload.auction_id);
        if (auction.creator_id === userId) {
          throw new BadRequestError("Auction creator cannot place bids on their own auction");
        }

        const highestBid = new Money(
          Math.max(
            await this.getHighestAuctionBidAmountWithLock(client, auction.id),
            auction.starting_price
          )
        );
        logger.log(
          `[MONEY_BID_VALIDATION] Auction ${payload.auction_id}: current_highest=$${highestBid.getFormattedAmount()}, attempt=$${bidAmount.getFormattedAmount()} [Key: ${IDEMPOTENCY_KEY}]`
        );

        this.assertMinimumBidIncrease({
          auction,
          currentBid: bidAmount,
          highestBid: highestBid.getAmountInCents()
        });

        const result = await client.query<Bid>(
          `INSERT INTO bids (auction_id, user_id, amount, created_at) 
           VALUES ($1, $2, $3, NOW()) 
           RETURNING *`,
          [payload.auction_id, userId, payload.amount]
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

        if (canTryAgain) {
          if (PgError.isSerializationFailure(error) || PgError.isDeadlockDetected(error)) {
            const delay = RETRY_DELAY_MS * Math.pow(2, attempt);

            logger.log(
              `[MONEY_BID_RETRY] Serialization failure, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES}) [Key: ${IDEMPOTENCY_KEY}]`
            );

            // Release connection before delay to prevent pool exhaustion
            client.release();

            // Non-blocking delay - event loop remains responsive
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }

        // Handle specific PostgreSQL errors
        if (PgError.isPgError(error)) {
          const pgError = error as { code: string };

          if (pgError.code === "40001") {
            // Serialization failure after all retries
            const errorMsg = "High bidding activity detected. Please try again.";
            logger.error(
              `[MONEY_BID_SERIALIZATION_EXHAUSTED] ${errorMsg} [Key: ${IDEMPOTENCY_KEY}]`
            );
            throw new PgError(errorMsg, 409);
          }
        }

        // Log all other errors
        const duration = Date.now() - START_TIME;
        logger.error(
          `[MONEY_BID_ERROR] User ${userId} failed to bid $${bidAmount.getFormattedAmount()} on auction ${payload.auction_id} after ${duration}ms: ${error instanceof Error ? error.message : String(error)} [Key: ${IDEMPOTENCY_KEY}]`
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

  private async checkForDuplicateBid(
    client: PoolClient,
    userId: number,
    payload: CreateBidPayload
  ): Promise<Bid | null> {
    // Check for exact duplicate bids within the last 30 seconds (idempotency window)
    const result = await client.query<Bid>(
      `SELECT * FROM bids 
       WHERE user_id = $1 AND auction_id = $2 AND amount = $3 
       AND created_at > NOW() - INTERVAL '30 seconds'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId, payload.auction_id, payload.amount]
    );

    return result.rows[0] || null;
  }

  private async getActiveAuctionByIdWithLock(client: PoolClient, auctionId: number) {
    const result = await client.query<Auction>(
      `SELECT * FROM auctions 
       WHERE id = $1 AND is_cancelled = FALSE 
       AND start_time < NOW() 
       AND start_time + duration_hours * INTERVAL '1 hour' > NOW()
       FOR UPDATE NOWAIT`,
      [auctionId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError("Auction not found or not active");
    }

    return result.rows[0];
  }

  private async getHighestAuctionBidAmountWithLock(
    client: PoolClient,
    auctionId: number
  ): Promise<number> {
    const result = await client.query<{ amount: number }>(
      `SELECT amount FROM bids 
       WHERE auction_id = $1 
       ORDER BY amount DESC 
       LIMIT 1
       FOR UPDATE NOWAIT`,
      [auctionId]
    );

    if (result.rows.length === 0) {
      return 0;
    }
    return result.rows[0].amount;
  }

  private assertMinimumBidIncrease({
    auction,
    currentBid,
    highestBid
  }: {
    auction: Auction;
    currentBid: Money;
    highestBid: number;
  }) {
    const MINIMUM_BID_INCREASE_AMOUNT = Math.round(auction.starting_price * 0.1); // 10% of starting price
    const minimumAcceptableBid = new Money(highestBid + MINIMUM_BID_INCREASE_AMOUNT);

    if (currentBid.getAmountInCents() < minimumAcceptableBid.getAmountInCents()) {
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
