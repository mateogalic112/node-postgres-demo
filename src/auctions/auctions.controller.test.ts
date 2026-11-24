import {
  createProductRequest,
  createTestApp,
  db,
  getAuthCookieAfterRegister
} from "__tests__/setup";
import App from "app";
import { addDays, subDays } from "date-fns";
import request from "supertest";
import { CreateAuctionPayload } from "./auctions.validation";

type AuctionPayload = {
  product_id: number;
  start_time?: Date;
  duration_hours?: number;
  starting_price_in_cents?: number;
};

export const createMockedAuctionPayload = (payload: AuctionPayload): CreateAuctionPayload => ({
  product_id: payload.product_id,
  start_time: payload.start_time ?? addDays(new Date(), 1),
  duration_hours: payload.duration_hours ?? 24,
  starting_price_in_cents: payload.starting_price_in_cents ?? 100
});

describe("AuctionsController", () => {
  let app: App;

  beforeAll(() => {
    app = createTestApp();
  });

  describe("POST /api/v1/auctions", () => {
    let seller: string = "";
    let productId: number = 0;

    beforeEach(async () => {
      seller = await getAuthCookieAfterRegister(app, "creator");

      const productResponse = await createProductRequest(app, seller);
      productId = productResponse.body.data.id;
    });

    it("should create an auction", async () => {
      const payload = createMockedAuctionPayload({ product_id: productId });

      const response = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", seller)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.data.product_id).toBe(productId);
    });

    it("should NOT create an auction when product is not found", async () => {
      const nonExistentProductId = 12345;
      const payload = createMockedAuctionPayload({ product_id: nonExistentProductId });

      const response = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", seller)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it("should NOT create an auction when starting time is in the past", async () => {
      const payload = createMockedAuctionPayload({
        product_id: productId,
        start_time: subDays(new Date(), 1)
      });

      const response = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", seller)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Auction start time must be in the future");
    });

    it("should NOT create an auction when duration is less than 24 hours", async () => {
      const payload = createMockedAuctionPayload({ product_id: productId, duration_hours: 23 });

      const response = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", seller)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Auction duration must be at least 24 hours");
    });

    it("should NOT create an auction when starting price is less than 100 cents", async () => {
      const payload = createMockedAuctionPayload({
        product_id: productId,
        starting_price_in_cents: 99
      });

      const response = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", seller)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Starting price must be at least 100 cents");
    });

    it("should NOT create an auction when there is a race condition with products", async () => {
      const payload = createMockedAuctionPayload({ product_id: productId });

      const response = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", seller)
        .send(payload);

      const response2 = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", seller)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.data.product_id).toBe(productId);

      expect(response2.status).toBe(400);
      expect(response2.body.message).toBeDefined();
    });
  });

  describe("PATCH /api/v1/auctions/:id/cancel", () => {
    let seller: string = "";
    let productId: number = 0;
    let auctionId: number = 0;

    const FAILED_RESPONSE = {
      status: 400,
      body: { message: "Auction can't be cancelled" }
    };

    beforeEach(async () => {
      seller = await getAuthCookieAfterRegister(app, "creator");

      const productResponse = await createProductRequest(app, seller);
      productId = productResponse.body.data.id;

      const auctionResponse = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", seller)
        .send(createMockedAuctionPayload({ product_id: productId }));
      auctionId = auctionResponse.body.data.id;
    });

    it("should cancel the auction", async () => {
      const response = await request(app.getServer())
        .patch(`/api/v1/auctions/${auctionId}/cancel`)
        .set("Cookie", seller);

      expect(response).toMatchObject({
        status: 200,
        body: { data: { id: auctionId } }
      });
    });

    it("should NOT cancel an auction when not the creator", async () => {
      const notSeller = await getAuthCookieAfterRegister(app, "not-seller");

      const response = await request(app.getServer())
        .patch(`/api/v1/auctions/${auctionId}/cancel`)
        .set("Cookie", notSeller);

      expect(response).toMatchObject(FAILED_RESPONSE);
    });

    it("should NOT cancel an auction when auction has finished", async () => {
      await db.query(
        `UPDATE auctions
         SET start_time = NOW() - INTERVAL '5 days',
             created_at = NOW() - INTERVAL '10 days'
         WHERE id = $1`,
        [auctionId]
      );

      const response = await request(app.getServer())
        .patch(`/api/v1/auctions/${auctionId}/cancel`)
        .set("Cookie", seller);

      expect(response).toMatchObject(FAILED_RESPONSE);
    });

    it("should NOT cancel an auction when auction has been cancelled", async () => {
      await db.query(
        `UPDATE auctions
         SET is_cancelled = TRUE
         WHERE id = $1`,
        [auctionId]
      );

      const response = await request(app.getServer())
        .patch(`/api/v1/auctions/${auctionId}/cancel`)
        .set("Cookie", seller);

      expect(response).toMatchObject(FAILED_RESPONSE);
    });
  });
});
