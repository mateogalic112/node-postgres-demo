import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import App from "app";
import { Client } from "pg";
import { ProductHttpController } from "./products.controller";
import { ProductService } from "./products.service";
import { ProductRepository } from "./products.repository";
import request from "supertest";
import { CreateProductPayload } from "./products.validation";
import { faker } from "@faker-js/faker/.";
import { AuthHttpController } from "auth/auth.controller";
import { AuthService } from "auth/auth.service";
import { UsersRepository } from "users/users.repository";
import { UserService } from "users/users.service";
import { closeDatabase, prepareDatabase, resetDatabase } from "__tests__/setup";
import { createMockDatabaseService, filesService, mailService } from "__tests__/mocks";

describe("ProductsController", () => {
  let client: Client;
  let app: App;
  let postgresContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    const { client: freshClient, postgresContainer: freshContainer } = await prepareDatabase();
    client = freshClient;
    postgresContainer = freshContainer;

    const DB = createMockDatabaseService(client);

    const authService = new AuthService(new UserService(new UsersRepository(DB)));
    const productService = new ProductService(new ProductRepository(DB), mailService, filesService);

    app = new App(
      [new AuthHttpController(authService), new ProductHttpController(productService, authService)],
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

  describe("GET /api/v1/products", () => {
    it("should return paginated products WITH next cursor", async () => {
      const user = await client.query(
        "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
        ["testuser", "test@example.com", "password"]
      );

      const products: Array<CreateProductPayload["body"] & { image_url: string | null }> =
        Array.from({ length: 21 }, () => ({
          name: faker.commerce.productName(),
          description: faker.commerce.productDescription(),
          image_url: faker.image.url()
        }));

      for (const { name, description, image_url } of products) {
        await client.query(
          `INSERT INTO products (name, description, image_url, owner_id) VALUES ($1, $2, $3, $4)`,
          [name, description, image_url, user.rows[0].id]
        );
      }

      const response = await request(app.getServer()).get("/api/v1/products").query({ limit: 10 });
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10);
      expect(response.body.nextCursor).toMatchObject({
        id: 10
      });
    });

    it("should return paginated products WITHOUT next cursor", async () => {
      const user = await client.query(
        "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
        ["testuser", "test@example.com", "password"]
      );

      const products: Array<CreateProductPayload["body"] & { image_url: string | null }> =
        Array.from({ length: 8 }, () => ({
          name: faker.commerce.productName(),
          description: faker.commerce.productDescription(),
          image_url: faker.image.url()
        }));

      for (const { name, description, image_url } of products) {
        await client.query(
          `INSERT INTO products (name, description, image_url, owner_id) VALUES ($1, $2, $3, $4)`,
          [name, description, image_url, user.rows[0].id]
        );
      }

      const response = await request(app.getServer()).get("/api/v1/products").query({ limit: 10 });
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(8);
      expect(response.body.nextCursor).toBeNull();
    });
  });

  describe("POST /api/v1/products", () => {
    it("should create a product when authenticated", async () => {
      // First register a user
      const userResponse = await request(app.getServer()).post("/api/v1/auth/register").send({
        username: "testuser",
        email: "test@example.com",
        password: "password"
      });

      expect(userResponse.status).toBe(201);

      // Get the authentication cookie
      const authCookie = userResponse.headers["set-cookie"][0];

      const payload: CreateProductPayload["body"] & { image_url: string | null } = {
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        image_url: null
      };

      const mockImageBuffer = Buffer.from("fake-image-data");

      const response = await request(app.getServer())
        .post("/api/v1/products")
        .set("Cookie", authCookie)
        .field("name", payload.name)
        .field("description", payload.description)
        .attach("image", mockImageBuffer, {
          filename: "test-image.jpg",
          contentType: "image/jpeg"
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        data: {
          id: 1,
          ...payload,
          image_url: "https://example.com/image.jpg"
        }
      });
    });

    it("should NOT create a product when NOT authenticated", async () => {
      const payload: CreateProductPayload["body"] & { image_url: string | null } = {
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        image_url: faker.image.url()
      };

      const response = await request(app.getServer()).post("/api/v1/products").send(payload);
      expect(response.status).toBe(401);
    });
  });
});
