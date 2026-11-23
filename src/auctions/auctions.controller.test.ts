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

export const createMockedAuctionPayload = (productId: number): CreateAuctionPayload => ({
  product_id: productId,
  start_time: addDays(new Date(), 1),
  duration_hours: 24,
  starting_price_in_cents: 1000
});

describe("AuctionsController", () => {
  let app: App;

  beforeAll(() => {
    app = createTestApp();
  });

  describe("POST /api/v1/auctions", () => {
    it("should NOT create an auction when product is not found or deleted", async () => {
      const seller = await getAuthCookieAfterRegister(app, "testuser");
      const nonExistentProductId = 12345;

      const mockedAuctionPayload = createMockedAuctionPayload(nonExistentProductId);
      const response = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", seller)
        .send(mockedAuctionPayload);

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it("should NOT create an auction when starting time is in the past", async () => {
      const authCookie = await getAuthCookieAfterRegister(app, "testuser");

      const productResponse = await createProductRequest(app, authCookie);
      const productId = productResponse.body.data.id;

      const mockedAuctionPayload = createMockedAuctionPayload(productId);
      const response = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", authCookie)
        .send({ ...mockedAuctionPayload, start_time: subDays(new Date(), 1) });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Auction start time must be in the future");
    });

    it("should NOT create an auction when duration is less than 24 hours", async () => {
      const authCookie = await getAuthCookieAfterRegister(app, "testuser");

      const productResponse = await createProductRequest(app, authCookie);
      const productId = productResponse.body.data.id;

      const mockedAuctionPayload = createMockedAuctionPayload(productId);
      const response = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", authCookie)
        .send({ ...mockedAuctionPayload, duration_hours: 23 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Auction duration must be at least 24 hours");
    });

    it("should NOT create an auction when starting price is less than 100 cents", async () => {
      const authCookie = await getAuthCookieAfterRegister(app, "testuser");

      const productResponse = await createProductRequest(app, authCookie);
      const productId = productResponse.body.data.id;

      const mockedAuctionPayload = createMockedAuctionPayload(productId);
      const response = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", authCookie)
        .send({ ...mockedAuctionPayload, starting_price_in_cents: 99 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Starting price must be at least 100 cents");
    });

    it("should create an auction when authenticated", async () => {
      const authCookie = await getAuthCookieAfterRegister(app, "testuser");

      const productResponse = await createProductRequest(app, authCookie);
      const productId = productResponse.body.data.id;

      const mockedAuctionPayload = createMockedAuctionPayload(productId);
      const response = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", authCookie)
        .send(mockedAuctionPayload);

      expect(response.status).toBe(201);
      expect(response.body.data.product_id).toBe(productId);
    });

    it("should NOT create an auction when there is a race condition with products", async () => {
      const authCookie = await getAuthCookieAfterRegister(app, "testuser");

      const productResponse = await createProductRequest(app, authCookie);
      const productId = productResponse.body.data.id;

      const mockedAuctionPayload = createMockedAuctionPayload(productId);
      const response = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", authCookie)
        .send(mockedAuctionPayload);

      const response2 = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", authCookie)
        .send(mockedAuctionPayload);

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
      body: { message: "Failed to cancel!" }
    };

    beforeEach(async () => {
      seller = await getAuthCookieAfterRegister(app, "creator");

      const productResponse = await createProductRequest(app, seller);
      productId = productResponse.body.data.id;

      const auctionResponse = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", seller)
        .send(createMockedAuctionPayload(productId));
      auctionId = auctionResponse.body.data.id;
    });

    it("should NOT cancel an auction when auction is not found", async () => {
      const nonExistentAuctionId = 12345;

      const response = await request(app.getServer())
        .patch(`/api/v1/auctions/${nonExistentAuctionId}/cancel`)
        .set("Cookie", seller);

      expect(response).toMatchObject(FAILED_RESPONSE);
    });

    it("should NOT cancel an auction when authenticated but not the creator", async () => {
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
             created_at = NOW() - INTERVAL '10 days',
             duration_hours = 24
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
