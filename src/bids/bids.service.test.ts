import { logger } from "__tests__/mocks";
import { BidsService } from "./bids.service";
import { BidsRepository } from "./bids.repository";
import { BadRequestError } from "api/api.errors";
import { DatabaseService } from "interfaces/database.interface";
import { PoolClient } from "pg";
import { Bid } from "./bids.validation";

const createMockClient = () => ({
  query: jest.fn(),
  release: jest.fn()
});

const createMockDB = (
  client: ReturnType<typeof createMockClient>
): jest.Mocked<DatabaseService> => ({
  query: jest.fn(),
  getClient: jest.fn().mockResolvedValue(client as unknown as PoolClient)
});

const createMockBidsRepository = () =>
  ({
    getBiddingAuction: jest.fn(),
    getHighestBidAmountForAuction: jest.fn(),
    createBid: jest.fn(),
    getBidsByAuctionId: jest.fn()
  }) as unknown as jest.Mocked<BidsRepository>;

const makePgError = (code: string) => {
  const error = new Error("pg error") as Error & { code: string };
  error.code = code;
  return error;
};

const makeBidRow = (userId: number, overrides?: Partial<Bid>): Bid => {
  const now = new Date();
  return {
    id: 1,
    auction_id: 10,
    user_id: userId,
    amount_in_cents: 5000,
    idempotency_key: `bid_${userId}_10_5000`,
    created_at: now,
    updated_at: now,
    ...overrides
  };
};

describe("BidsService", () => {
  let bidsService: BidsService;
  let mockBidsRepository: jest.Mocked<BidsRepository>;
  let mockDB: jest.Mocked<DatabaseService>;
  let mockClient: ReturnType<typeof createMockClient>;

  const mockedUserId = 1;

  beforeEach(() => {
    jest.useFakeTimers();
    mockClient = createMockClient();
    mockDB = createMockDB(mockClient);
    mockBidsRepository = createMockBidsRepository();
    bidsService = new BidsService(mockBidsRepository, mockDB, logger);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("createBid", () => {
    const payload = { auction_id: 10, amount_in_cents: 5_000 };

    beforeEach(() => {
      const now = new Date();
      mockBidsRepository.getBiddingAuction.mockResolvedValue({
        id: 10,
        product_id: 1,
        creator_id: 99,
        winner_id: null,
        start_time: now,
        duration_hours: 48,
        starting_price_in_cents: 1000,
        is_cancelled: false,
        created_at: now,
        updated_at: now
      });
      mockBidsRepository.getHighestBidAmountForAuction.mockResolvedValue(0);
      mockBidsRepository.createBid.mockResolvedValue(makeBidRow(mockedUserId));
    });

    it("should create a bid and return the parsed result", async () => {
      const result = await bidsService.createBid(mockedUserId, payload);

      expect(result).toMatchObject({
        id: expect.any(Number),
        auction_id: payload.auction_id,
        user_id: mockedUserId,
        amount_in_cents: payload.amount_in_cents
      });
    });

    it("should ROLLBACK the transaction on error", async () => {
      mockBidsRepository.createBid.mockRejectedValue(new Error("insert failed"));

      await expect(bidsService.createBid(mockedUserId, payload)).rejects.toThrow("insert failed");
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    });

    describe("minimum bid enforcement", () => {
      it("should throw BadRequestError when bid is below starting price + 10%", async () => {
        // starting_price_in_cents = 1000, 10% = 100, minimum = 1100
        const lowPayload = { auction_id: 10, amount_in_cents: 1099 };

        await expect(bidsService.createBid(mockedUserId, lowPayload)).rejects.toThrow(
          BadRequestError
        );
      });

      it("should accept bid at exactly the minimum threshold", async () => {
        // starting_price_in_cents = 1000, 10% = 100, minimum = 1100
        const exactPayload = { auction_id: 10, amount_in_cents: 1100 };
        mockBidsRepository.createBid.mockResolvedValue(
          makeBidRow(mockedUserId, { amount_in_cents: 1100, idempotency_key: "bid_1_10_1100" })
        );

        const result = await bidsService.createBid(mockedUserId, exactPayload);

        expect(result.amount_in_cents).toBe(1100);
      });

      it("should enforce minimum increase above the highest existing bid", async () => {
        // highest bid = 3000, starting price = 1000, 10% of starting = 100, minimum = 3100
        mockBidsRepository.getHighestBidAmountForAuction.mockResolvedValue(3000);
        const lowPayload = { auction_id: 10, amount_in_cents: 3099 };

        await expect(bidsService.createBid(mockedUserId, lowPayload)).rejects.toThrow(
          BadRequestError
        );
      });

      it("should accept bid above the highest existing bid + minimum increase", async () => {
        mockBidsRepository.getHighestBidAmountForAuction.mockResolvedValue(3000);
        const validPayload = { auction_id: 10, amount_in_cents: 3100 };
        mockBidsRepository.createBid.mockResolvedValue(
          makeBidRow(mockedUserId, { amount_in_cents: 3100, idempotency_key: "bid_1_10_3100" })
        );

        const result = await bidsService.createBid(mockedUserId, validPayload);

        expect(result.amount_in_cents).toBe(3100);
      });

      it("should use starting price as the base when it exceeds highest bid", async () => {
        // highest bid = 500 (below starting price of 1000), minimum = 1000 + 100 = 1100
        mockBidsRepository.getHighestBidAmountForAuction.mockResolvedValue(500);
        const lowPayload = { auction_id: 10, amount_in_cents: 1099 };

        await expect(bidsService.createBid(mockedUserId, lowPayload)).rejects.toThrow(
          BadRequestError
        );
      });
    });

    describe("retry logic", () => {
      it("should retry on serialization failure (40001)", async () => {
        mockBidsRepository.createBid
          .mockRejectedValueOnce(makePgError("40001"))
          .mockResolvedValueOnce(makeBidRow(mockedUserId));

        const promise = bidsService.createBid(mockedUserId, payload);
        await jest.advanceTimersByTimeAsync(100); // first retry delay: 100ms

        const result = await promise;

        expect(result.amount_in_cents).toBe(5000);
        expect(mockDB.getClient).toHaveBeenCalledTimes(2);
      });

      it("should retry on deadlock detected (40P01)", async () => {
        mockBidsRepository.createBid
          .mockRejectedValueOnce(makePgError("40P01"))
          .mockResolvedValueOnce(makeBidRow(mockedUserId));

        const promise = bidsService.createBid(mockedUserId, payload);
        await jest.advanceTimersByTimeAsync(100);

        const result = await promise;

        expect(result.amount_in_cents).toBe(5000);
        expect(mockDB.getClient).toHaveBeenCalledTimes(2);
      });

      it("should use exponential backoff for retries", async () => {
        mockBidsRepository.createBid
          .mockRejectedValueOnce(makePgError("40001"))
          .mockRejectedValueOnce(makePgError("40001"))
          .mockResolvedValueOnce(makeBidRow(mockedUserId));

        const promise = bidsService.createBid(mockedUserId, payload);
        await jest.advanceTimersByTimeAsync(100); // 100 * 2^0 = 100ms
        await jest.advanceTimersByTimeAsync(200); // 100 * 2^1 = 200ms

        await promise;

        expect(mockDB.getClient).toHaveBeenCalledTimes(3);
      });

      it("should rethrow after exhausting all retries", async () => {
        jest.useRealTimers();
        mockBidsRepository.createBid.mockRejectedValue(makePgError("40001"));

        await expect(bidsService.createBid(mockedUserId, payload)).rejects.toThrow("pg error");
        expect(mockDB.getClient).toHaveBeenCalledTimes(5);
        jest.useFakeTimers();
      });

      it("should not retry on non-retryable errors", async () => {
        const error = new Error("some other error");
        mockBidsRepository.createBid.mockRejectedValue(error);

        await expect(bidsService.createBid(mockedUserId, payload)).rejects.toThrow(
          "some other error"
        );
        expect(mockDB.getClient).toHaveBeenCalledTimes(1);
      });

      it("should ROLLBACK on each failed attempt before retrying", async () => {
        mockBidsRepository.createBid
          .mockRejectedValueOnce(makePgError("40001"))
          .mockResolvedValueOnce(makeBidRow(mockedUserId));

        const promise = bidsService.createBid(mockedUserId, payload);
        await jest.advanceTimersByTimeAsync(100);
        await promise;

        // ROLLBACK from first attempt, COMMIT from second
        const queryArgs = mockClient.query.mock.calls.map((c) => c[0]);
        expect(queryArgs).toContain("ROLLBACK");
        expect(queryArgs).toContain("COMMIT");
      });

      it("should release the client on each attempt", async () => {
        const client1 = createMockClient();
        const client2 = createMockClient();
        mockDB.getClient
          .mockResolvedValueOnce(client1 as unknown as PoolClient)
          .mockResolvedValueOnce(client2 as unknown as PoolClient);
        mockBidsRepository.createBid
          .mockRejectedValueOnce(makePgError("40001"))
          .mockResolvedValueOnce(makeBidRow(mockedUserId));

        const promise = bidsService.createBid(mockedUserId, payload);
        await jest.advanceTimersByTimeAsync(100);
        await promise;

        expect(client1.release).toHaveBeenCalled();
        expect(client2.release).toHaveBeenCalled();
      });
    });
  });
});
