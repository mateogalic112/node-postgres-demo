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
  getAuthCookieAfterRegister,
  prepareDatabase,
  resetDatabase
} from "__tests__/setup";
import {
  createMockDatabaseService,
  embeddingService,
  filesService,
  mailService
} from "__tests__/mocks";
import { bulkInsertProducts } from "./mocks/products.mock";

describe("ProductsController", () => {
  let client: Client;
  let app: App;

  beforeAll(async () => {
    const { client: freshClient } = await prepareDatabase();
    client = freshClient;

    const DB = createMockDatabaseService(client);
    const authService = new AuthService(new UserService(new UsersRepository(DB)));
    const productService = new ProductService(
      new ProductRepository(DB),
      mailService,
      filesService,
      embeddingService
    );

    app = new App(
      [new AuthHttpController(authService), new ProductHttpController(productService, authService)],
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

  describe("GET /api/v1/products", () => {
    it("should return paginated products WITH next cursor", async () => {
      await bulkInsertProducts(app, 21);

      const response = await request(app.getServer()).get("/api/v1/products").query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10);
      expect(response.body.nextCursor.id).toBe(10);
    });

    it("should return paginated products WITHOUT next cursor", async () => {
      await bulkInsertProducts(app, 8);

      const response = await request(app.getServer()).get("/api/v1/products").query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(8);
      expect(response.body.nextCursor).toBeNull();
    });
  });

  describe("POST /api/v1/products", () => {
    it("should NOT create a product when NOT authenticated", async () => {
      const response = await request(app.getServer()).post("/api/v1/products");

      expect(response.status).toBe(401);
    });

    it("should create a product when authenticated", async () => {
      const authCookie = await getAuthCookieAfterRegister(app, "testuser");
      const productName = faker.commerce.productName();

      const response = await request(app.getServer())
        .post("/api/v1/products")
        .set("Cookie", authCookie)
        .field("name", productName)
        .field("description", faker.commerce.productDescription())
        .field("price_in_cents", faker.number.int({ min: 100, max: 100000 }))
        .attach("image", Buffer.from("fake-image-data"), {
          filename: "test-image.jpg",
          contentType: "image/jpeg"
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe(productName);
    });
  });
});
