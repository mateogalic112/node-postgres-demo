import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import App from "app";
import { Client } from "pg";
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

    const authService = new AuthService(new UserService(new UsersRepository(client)));
    const authController = new AuthHttpController(authService);

    const auctionService = new AuctionService(new AuctionRepository(client), mailService);

    app = new App([authController, new AuctionHttpController(auctionService, authService)], []);
  });

  beforeEach(async () => {
    await client.query("TRUNCATE TABLE auctions, products RESTART IDENTITY CASCADE");
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await client.end();
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

    // it.skip("should create an auction when authenticated", async () => {
    //   // First register a user
    //   const userResponse = await request(app.getServer()).post("/api/v1/auth/register").send({
    //     username: "testuser",
    //     email: "test@example.com",
    //     password: "password"
    //   });

    //   expect(userResponse.status).toBe(201);

    //   // Get the authentication cookie
    //   const authCookie = userResponse.headers["set-cookie"][0];

    //   const payload: CreateProductPayload["body"] & { image_url: string | null } = {
    //     name: faker.commerce.productName(),
    //     description: faker.commerce.productDescription(),
    //     price: +faker.commerce.price({ min: 1000, max: 100000, dec: 0 }),
    //     image_url: null
    //   };

    //   const mockImageBuffer = Buffer.from("fake-image-data");

    //   const response = await request(app.getServer())
    //     .post("/api/v1/products")
    //     .set("Cookie", authCookie)
    //     .field("name", payload.name)
    //     .field("description", payload.description)
    //     .field("price", payload.price)
    //     .attach("image", mockImageBuffer, {
    //       filename: "test-image.jpg",
    //       contentType: "image/jpeg"
    //     });

    //   expect(response.status).toBe(201);
    //   expect(response.body).toMatchObject({
    //     data: {
    //       id: 1,
    //       ...payload,
    //       image_url: "https://example.com/image.jpg"
    //     }
    //   });
    // });
  });
});
