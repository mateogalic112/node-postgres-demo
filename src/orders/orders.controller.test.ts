import App from "app";
import { Client } from "pg";
import request from "supertest";
import { AuthHttpController } from "auth/auth.controller";
import { AuthService } from "auth/auth.service";
import { UsersRepository } from "users/users.repository";
import { UserService } from "users/users.service";
import {
  closeDatabase,
  createProductRequest,
  getAuthCookieAfterRegister,
  prepareDatabase,
  resetDatabase
} from "__tests__/setup";
import { RolesRepository } from "roles/roles.repository";
import { OrderHttpController } from "./orders.controller";
import { OrderService } from "./orders.service";
import { OrderRepository } from "./orders.repository";
import { ProductHttpController } from "products/products.controller";
import { ProductRepository } from "products/products.repository";
import { ProductService } from "products/products.service";
import {
  createMockDatabaseService,
  mailService,
  paymentsService,
  filesService,
  embeddingService
} from "__tests__/mocks";

describe("OrdersController", () => {
  let client: Client;
  let app: App;

  beforeAll(async () => {
    const { client: freshClient } = await prepareDatabase();
    client = freshClient;

    const DB = createMockDatabaseService(client);
    const usersService = new UserService(
      new UsersRepository(DB),
      new RolesRepository(DB),
      paymentsService
    );
    const authService = new AuthService(usersService);
    const orderService = new OrderService(new OrderRepository(DB), mailService);
    const productService = new ProductService(
      new ProductRepository(DB),
      filesService,
      embeddingService
    );

    app = new App(
      [
        new AuthHttpController(authService),
        new OrderHttpController(authService, usersService, orderService, paymentsService),
        new ProductHttpController(productService, authService, mailService)
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

  describe("POST /api/v1/orders", () => {
    it("should throw an error when NOT authenticated", async () => {
      const response = await request(app.getServer()).post("/api/v1/orders");
      expect(response.status).toBe(401);
    });

    it("should throw an error when customer creation fails", async () => {
      // Override the mock for this specific test
      (paymentsService.createCustomer as jest.Mock).mockResolvedValueOnce(null);

      const authCookie = await getAuthCookieAfterRegister(app, "testuser");
      const productResponse = await createProductRequest(app, authCookie);
      const productId = productResponse.body.data.id;

      const response = await request(app.getServer())
        .post("/api/v1/orders")
        .set("Cookie", authCookie)
        .send({ line_items: [{ product_id: productId, quantity: 2 }] });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Customer not created!");
    });

    it("should throw an error when checkout session is not created", async () => {
      // Override the mock for this specific test
      (paymentsService.createCheckoutSession as jest.Mock).mockResolvedValueOnce(null);

      const authCookie = await getAuthCookieAfterRegister(app, "testuser");
      const productResponse = await createProductRequest(app, authCookie);
      const productId = productResponse.body.data.id;

      const response = await request(app.getServer())
        .post("/api/v1/orders")
        .set("Cookie", authCookie)
        .send({ line_items: [{ product_id: productId, quantity: 2 }] });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Checkout session not created!");
    });

    it("should create an order when authenticated", async () => {
      const authCookie = await getAuthCookieAfterRegister(app, "testuser");
      const productResponse = await createProductRequest(app, authCookie);
      const productId = productResponse.body.data.id;

      const response = await request(app.getServer())
        .post("/api/v1/orders")
        .set("Cookie", authCookie)
        .send({ line_items: [{ product_id: productId, quantity: 2 }] });

      expect(response.status).toBe(201);
      expect(response.body.data.url).toBeDefined();
    });
  });
});
