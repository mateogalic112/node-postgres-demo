import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
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
import { CreateAuctionPayload } from "./auctions.validation";
import { ProductHttpController } from "products/products.controller";
import { ProductService } from "products/products.service";
import { ProductRepository } from "products/products.repository";
import { addDays, subDays } from "date-fns";
import { createMockDatabaseService, filesService, mailService } from "__tests__/mocks";
import {
  closeDatabase,
  createAuctionRequest,
  createProductRequest,
  getAuthCookie,
  prepareDatabase,
  resetDatabase
} from "__tests__/setup";

describe("AuctionsController", () => {
  let client: Client;
  let app: App;
  let postgresContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    const { client: freshClient, postgresContainer: freshContainer } = await prepareDatabase();
    client = freshClient;
    postgresContainer = freshContainer;

    const DB = createMockDatabaseService(client);

    const authService = new AuthService(new UserService(new UsersRepository(DB)));
    const auctionService = new AuctionService(new AuctionRepository(DB), mailService);
    const productService = new ProductService(new ProductRepository(DB), mailService, filesService);

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

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase(client, postgresContainer);
  });

  describe("POST /api/v1/auctions", () => {
    it("should NOT create an auction when NOT authenticated", async () => {
      const payload: CreateAuctionPayload = {
        product_id: 1,
        start_time: new Date(),
        duration_hours: 24,
        starting_price_in_cents: 1000
      };

      const response = await request(app.getServer()).post("/api/v1/auctions").send(payload);
      expect(response.status).toBe(401);
    });

    it("should create an auction when authenticated", async () => {
      const authCookie = await getAuthCookie(app, "testuser");
      const product = await createProductRequest(app, authCookie);

      const payload: CreateAuctionPayload = {
        product_id: product.id,
        start_time: addDays(new Date(), 1),
        duration_hours: 24,
        starting_price_in_cents: 1000
      };

      const response = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", authCookie)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        data: {
          id: 1,
          ...payload,
          start_time: payload.start_time.toISOString()
        }
      });
    });

    it("should NOT create an auction when there is a race condition with products", async () => {
      const authCookie = await getAuthCookie(app, "testuser");
      const product = await createProductRequest(app, authCookie);

      const payload: CreateAuctionPayload = {
        product_id: product.id,
        start_time: addDays(new Date(), 1),
        duration_hours: 24,
        starting_price_in_cents: 1000
      };

      const response = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", authCookie)
        .send(payload);

      expect(response.status).toBe(201);

      const response2 = await request(app.getServer())
        .post("/api/v1/auctions")
        .set("Cookie", authCookie)
        .send(payload);

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
      const authCookie = await getAuthCookie(app, "testuser");
      const auctionId = 1;

      const response = await request(app.getServer())
        .patch(`/api/v1/auctions/${auctionId}/cancel`)
        .set("Cookie", authCookie);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Auction not found");
    });

    it("should NOT cancel an auction when authenticated but not the creator", async () => {
      const authCookie = await getAuthCookie(app, "testuser");
      const product = await createProductRequest(app, authCookie);
      const auction = await createAuctionRequest(app, authCookie, product.id);

      // Create a user to try to cancel the auction
      const authCookie2 = await getAuthCookie(app, "testuser2");

      const response = await request(app.getServer())
        .patch(`/api/v1/auctions/${auction.id}/cancel`)
        .set("Cookie", authCookie2);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("You are not the creator of this auction");
    });

    it("should NOT cancel an auction when auction has ended", async () => {
      const authCookie = await getAuthCookie(app, "testuser");
      const product = await createProductRequest(app, authCookie);

      // Temporarily drop the check constraint to allow creating an auction in the past
      await client.query("ALTER TABLE auctions DROP CONSTRAINT auctions_start_time_check");

      const auction = await client.query(
        `INSERT INTO auctions 
          (product_id, creator_id, start_time, duration_hours, starting_price_in_cents) 
          VALUES ($1, $2, $3, $4, $5) 
          RETURNING *
        `,
        [product.id, 1, subDays(new Date(), 10), 24, 1000]
      );

      // Restore the constraint (but don't validate existing rows)
      await client.query(
        "ALTER TABLE auctions ADD CONSTRAINT auctions_start_time_check CHECK (start_time > NOW()) NOT VALID"
      );

      const response = await request(app.getServer())
        .patch(`/api/v1/auctions/${auction.rows[0].id}/cancel`)
        .set("Cookie", authCookie);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Auction has ended");
    });

    it("should NOT cancel an auction when auction has been cancelled", async () => {
      const authCookie = await getAuthCookie(app, "testuser");
      const product = await createProductRequest(app, authCookie);
      const auction = await createAuctionRequest(app, authCookie, product.id);

      const response = await request(app.getServer())
        .patch(`/api/v1/auctions/${auction.id}/cancel`)
        .set("Cookie", authCookie);

      expect(response.status).toBe(200);

      const response2 = await request(app.getServer())
        .patch(`/api/v1/auctions/${auction.id}/cancel`)
        .set("Cookie", authCookie);

      expect(response2.status).toBe(400);
      expect(response2.body.message).toBe("Auction has been cancelled");
    });
  });
});
