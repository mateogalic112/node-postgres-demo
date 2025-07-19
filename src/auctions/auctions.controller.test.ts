import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import App from "app";
import { Client, PoolClient } from "pg";
import request from "supertest";
import { AuthHttpController } from "auth/auth.controller";
import { AuthService } from "auth/auth.service";
import { UsersRepository } from "users/users.repository";
import { MailService } from "interfaces/mail.interface";
import { UserService } from "users/users.service";
import { migrate } from "database/setup";
import { AuctionService } from "./auctions.service";
import { AuctionRepository } from "./auctions.repository";
import { AuctionHttpController } from "./auctions.controller";
import { CreateAuctionPayload } from "./auctions.validation";
import { faker } from "@faker-js/faker/.";
import { ProductHttpController } from "products/products.controller";
import { ProductService } from "products/products.service";
import { ProductRepository } from "products/products.repository";
import { FilesService } from "interfaces/files.interface";
import { addDays } from "date-fns";
import { DatabaseService } from "interfaces/database.interface";

describe("AuctionsController", () => {
  let client: Client;
  let app: App;
  let postgresContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    // @dev Start the postgres container
    postgresContainer = await new PostgreSqlContainer("postgres:15").start();

    // @dev Connect to the database
    client = new Client({ connectionString: postgresContainer.getConnectionUri() });
    await client.connect();

    // @dev Run migrations
    await migrate(client);

    const mailService: MailService = {
      sendEmail: jest.fn().mockResolvedValue("123e4567-e89b-12d3-a456-426614174000")
    };

    const filesService: FilesService = {
      uploadFile: jest.fn().mockResolvedValue("https://example.com/image.jpg")
    };

    const DB: DatabaseService = {
      query: client.query.bind(client),
      getClient: async () =>
        ({
          ...client,
          query: client.query.bind(client),
          release: client.end
        }) as unknown as PoolClient
    };

    const authService = new AuthService(new UserService(new UsersRepository(DB)));
    const authController = new AuthHttpController(authService);

    const auctionService = new AuctionService(new AuctionRepository(DB), DB, mailService);
    const productService = new ProductService(new ProductRepository(DB), mailService, filesService);

    app = new App(
      [
        authController,
        new AuctionHttpController(auctionService, authService),
        new ProductHttpController(productService, authService)
      ],
      []
    );
  });

  beforeEach(async () => {
    await client.query("TRUNCATE TABLE users, auctions, products RESTART IDENTITY CASCADE");
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    try {
      await client.end();
    } catch (error) {
      console.warn("Error ending client:", error);
    }

    try {
      await postgresContainer.stop({ timeout: 1000 });
    } catch (error) {
      console.warn("Error stopping container:", error);
    }
  });

  describe("POST /api/v1/auctions", () => {
    it("should NOT create an auction when NOT authenticated", async () => {
      const payload: CreateAuctionPayload = {
        product_id: 1,
        start_time: new Date(),
        duration_hours: 24,
        starting_price: 1000
      };

      const response = await request(app.getServer()).post("/api/v1/auctions").send(payload);
      expect(response.status).toBe(401);
    });

    it("should create an auction when authenticated", async () => {
      // First register a user
      const userResponse = await request(app.getServer()).post("/api/v1/auth/register").send({
        username: "testuser",
        email: "test@example.com",
        password: "password"
      });

      expect(userResponse.status).toBe(201);

      // Get the authentication cookie
      const authCookie = userResponse.headers["set-cookie"][0];

      const productResponse = await request(app.getServer())
        .post("/api/v1/products")
        .set("Cookie", authCookie)
        .field("name", faker.commerce.productName())
        .field("description", faker.commerce.productDescription());

      expect(productResponse.status).toBe(201);

      const payload: CreateAuctionPayload = {
        product_id: productResponse.body.data.id,
        start_time: addDays(new Date(), 1),
        duration_hours: 24,
        starting_price: 1000
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
  });
});
