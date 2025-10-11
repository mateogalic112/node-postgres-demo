import App from "app";
import { Client } from "pg";
import request from "supertest";
import { AuthHttpController } from "auth/auth.controller";
import { AuthService } from "auth/auth.service";
import { UsersRepository } from "users/users.repository";
import { UserService } from "users/users.service";
import { AuctionService } from "./auctions.service";
import { AuctionRepository } from "./auctions.repository";
import { AuctionHttpController } from "./auctions.controller";
import { ProductHttpController } from "products/products.controller";
import { ProductService } from "products/products.service";
import { ProductRepository } from "products/products.repository";
import {
  createMockDatabaseService,
  embeddingService,
  filesService,
  mailService
} from "__tests__/mocks";
import {
  closeDatabase,
  createAuctionRequest,
  createProductRequest,
  getAuthCookieAfterRegister,
  prepareDatabase,
  registerUserRequest,
  resetDatabase
} from "__tests__/setup";
import { createMockedAuctionPayload, createFinishedAuction } from "./mocks/auction.mocks";
import { subDays } from "date-fns";
import { RolesRepository } from "roles/roles.repository";

describe("AuctionsController", () => {
  let client: Client;
  let app: App;

  beforeAll(async () => {
    const { client: freshClient } = await prepareDatabase();
    client = freshClient;

    const DB = createMockDatabaseService(client);
    const authService = new AuthService(
      new UserService(new UsersRepository(DB, new RolesRepository(DB)))
    );
    const auctionService = new AuctionService(new AuctionRepository(DB), mailService);
    const productService = new ProductService(
      new ProductRepository(DB),
      mailService,
      filesService,
      embeddingService
    );

    app = new App(
      [
        new AuthHttpController(authService),
        new AuctionHttpController(auctionService, authService),
        new ProductHttpController(productService, authService)
      ],
      []
    );
  });

  beforeEach(async () => {
    await resetDatabase(client);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase(client);
  });

  describe("POST /api/v1/auctions", () => {
    it("should NOT create an auction when NOT authenticated", async () => {
      const response = await request(app.getServer()).post("/api/v1/auctions");

      expect(response.status).toBe(401);
    });

    it("should NOT create an auction when product is not found or deleted", async () => {
      const authCookie = await getAuthCookieAfterRegister(app, "testuser");
      const nonExistentProductId = 12345;

      const mockedAuctionPayload = createMockedAuctionPayload(nonExistentProductId);
      const response = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", authCookie)
        .send(mockedAuctionPayload);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Product not found. Please try again.");
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
      expect(response2.body.message).toBe("Product already auctioned. Please try again.");
    });
  });

  describe("PATCH /api/v1/auctions/:id/cancel", () => {
    it("should NOT cancel an auction when NOT authenticated", async () => {
      const response = await request(app.getServer()).patch("/api/v1/auctions/1/cancel");

      expect(response.status).toBe(401);
    });

    it("should NOT cancel an auction when auction is not found", async () => {
      const authCookie = await getAuthCookieAfterRegister(app, "testuser");
      const nonExistentAuctionId = 12345;

      const response = await request(app.getServer())
        .patch(`/api/v1/auctions/${nonExistentAuctionId}/cancel`)
        .set("Cookie", authCookie);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Auction not found");
    });

    it("should NOT cancel an auction when authenticated but not the creator", async () => {
      const creatorCookie = await getAuthCookieAfterRegister(app, "creator");
      const productResponse = await createProductRequest(app, creatorCookie);
      const productId = productResponse.body.data.id;

      const auctionResponse = await createAuctionRequest(app, creatorCookie, productId);
      const auctionId = auctionResponse.body.data.id;

      const unauthorizedUserCookie = await getAuthCookieAfterRegister(app, "unauthorizedUser");
      const response = await request(app.getServer())
        .patch(`/api/v1/auctions/${auctionId}/cancel`)
        .set("Cookie", unauthorizedUserCookie);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("You are not the creator of this auction");
    });

    it("should NOT cancel an auction when auction has finished", async () => {
      const userResponse = await registerUserRequest(app, "testuser");
      const authCookie = userResponse.headers["set-cookie"][0];

      const productResponse = await createProductRequest(app, authCookie);
      const productId = productResponse.body.data.id;

      const finishedAuction = await createFinishedAuction(
        client,
        userResponse.body.data.id,
        productId
      );

      const response = await request(app.getServer())
        .patch(`/api/v1/auctions/${finishedAuction.id}/cancel`)
        .set("Cookie", authCookie);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Auction has ended");
    });

    it("should NOT cancel an auction when auction has been cancelled", async () => {
      const authCookie = await getAuthCookieAfterRegister(app, "testuser");
      const productResponse = await createProductRequest(app, authCookie);
      const productId = productResponse.body.data.id;

      const auctionResponse = await createAuctionRequest(app, authCookie, productId);
      const auctionId = auctionResponse.body.data.id;

      const response = await request(app.getServer())
        .patch(`/api/v1/auctions/${auctionId}/cancel`)
        .set("Cookie", authCookie);

      const response2 = await request(app.getServer())
        .patch(`/api/v1/auctions/${auctionId}/cancel`)
        .set("Cookie", authCookie);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        id: auctionId,
        is_cancelled: true
      });

      expect(response2.status).toBe(400);
      expect(response2.body.message).toBe("Auction has been cancelled");
    });
  });
});
