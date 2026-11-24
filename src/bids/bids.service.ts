import { BidsRepository } from "./bids.repository";
import { CreateBidPayload } from "./bids.validation";
import { BadRequestError, InternalServerError } from "api/api.errors";
import { DatabaseService } from "interfaces/database.interface";
import { PgError } from "database/errors";
import { Currency } from "money/currency";
import { LoggerService } from "interfaces/logger.interface";
import { AuctionBid } from "./bids.model";
import { Auction } from "auctions/auctions.validation";

export class BidsService {
  constructor(
    private readonly bidsRepository: BidsRepository,
    private readonly DB: DatabaseService,
    private readonly logger: LoggerService
  ) {}

  public async createBid(userId: number, payload: CreateBidPayload, auction: Auction) {
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 100;
    const QUERY_STATEMENT_TIMEOUT_MS = 10_000;

    const idempotencyKey = `bid_${userId}_${payload.auction_id}_${payload.amount_in_cents}`;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // @dev MUST use the same client instance for all statements within a transaction!
      // @link https://node-postgres.com/features/transactions
      const client = await this.DB.getClient();

      try {
        // @dev Set client query timeout to prevent indefinite blocking
        await client.query(`SET statement_timeout = ${QUERY_STATEMENT_TIMEOUT_MS}`);

        // @dev SERIALIZABLE isolation for maximum consistency (required for real money)
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");

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

        const newBid = await this.bidsRepository.createBid(client, userId, payload, idempotencyKey);

        await client.query("COMMIT");

        return newBid;
      } catch (error) {
        await client.query("ROLLBACK");

        const shouldRetryError =
          PgError.isSerializationFailure(error) || PgError.isDeadlockDetected(error);

        if (shouldRetryError && attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
          this.logger.log(
            `[MONEY_BID_RETRY] Serialization failure, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES}) [Key: ${idempotencyKey}]`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      } finally {
        client.release();
      }
    }

    throw new InternalServerError("Unable to place bid due to high system load. Please try again.");
  }
}
