import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import App from "app";
import { Client } from "pg";
import { ProductHttpController } from "./products.controller";
import { ProductService } from "./products.service";
import { ProductRepository } from "./products.repository";
import request from "supertest";
import { faker } from "@faker-js/faker/.";
import { AuthHttpController } from "auth/auth.controller";
import { AuthService } from "auth/auth.service";
import { UsersRepository } from "users/users.repository";
import { UserService } from "users/users.service";
import {
  closeDatabase,
  createProduct,
  createUser,
  getAuthCookieAfterRegister,
  prepareDatabase,
  resetDatabase
} from "__tests__/setup";
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
      const user = await createUser(client);

      const productPromises = Array.from({ length: 21 }, () => createProduct(client, user));
      await Promise.all(productPromises);

      const response = await request(app.getServer()).get("/api/v1/products").query({ limit: 10 });
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10);
      expect(response.body.nextCursor).toMatchObject({
        id: 10
      });
    });

    it("should return paginated products WITHOUT next cursor", async () => {
      const user = await createUser(client);

      const productPromises = Array.from({ length: 8 }, () => createProduct(client, user));
      await Promise.all(productPromises);

      const response = await request(app.getServer()).get("/api/v1/products").query({ limit: 10 });
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(8);
      expect(response.body.nextCursor).toBeNull();
    });
  });

  describe("POST /api/v1/products", () => {
    const productName = faker.commerce.productName();
    const productDescription = faker.commerce.productDescription();

    it("should NOT create a product when NOT authenticated", async () => {
      const response = await request(app.getServer())
        .post("/api/v1/products")
        .field("name", productName)
        .field("description", productDescription)
        .attach("image", Buffer.from("fake-image-data"), {
          filename: "test-image.jpg",
          contentType: "image/jpeg"
        });

      expect(response.status).toBe(401);
    });

    it("should create a product when authenticated", async () => {
      // Get the authentication cookie
      const authCookie = await getAuthCookieAfterRegister(app, "testuser");

      const response = await request(app.getServer())
        .post("/api/v1/products")
        .set("Cookie", authCookie)
        .field("name", productName)
        .field("description", productDescription)
        .attach("image", Buffer.from("fake-image-data"), {
          filename: "test-image.jpg",
          contentType: "image/jpeg"
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        data: {
          id: 1,
          name: productName,
          description: productDescription,
          image_url: "https://example.com/image.jpg"
        }
      });
    });
  });
});
