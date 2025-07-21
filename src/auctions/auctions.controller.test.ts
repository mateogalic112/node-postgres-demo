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
import { addDays } from "date-fns";
import { createMockDatabaseService, filesService, mailService } from "__tests__/mocks";
import {
  closeDatabase,
  createProduct,
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
    const auctionService = new AuctionService(new AuctionRepository(DB), DB, mailService);
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
      const authCookie = await getAuthCookie(app);
      const product = await createProduct(app, authCookie);

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
      const authCookie = await getAuthCookie(app);
      const product = await createProduct(app, authCookie);

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

      expect(response2.status).toBe(409);
      expect(response2.body.message).toBe("Product already auctioned. Please try again.");
    });
  });
});
