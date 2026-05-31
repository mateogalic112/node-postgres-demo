import App from "app";
import request from "supertest";
import { AuthHttpController } from "auth/auth.controller";
import { AuthService } from "auth/auth.service";
import { UsersRepository } from "users/users.repository";
import { UserService } from "users/users.service";
import { createProductRequest, getAuthCookieAfterRegister, getTestClient } from "__tests__/setup";
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
  let app: App;

  beforeAll(() => {
    const DB = createMockDatabaseService(getTestClient());
    const usersService = new UserService(
      new UsersRepository(DB),
      new RolesRepository(DB),
      paymentsService
    );
    const authService = new AuthService(usersService);
    const orderService = new OrderService(new OrderRepository(DB));
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

    it("should freeze the line item price even if the product price later changes", async () => {
      const authCookie = await getAuthCookieAfterRegister(app, "testuser");

      const productResponse = await createProductRequest(app, authCookie);
      const productId = productResponse.body.data.id;
      const orderPrice = productResponse.body.data.price_in_cents;

      const response = await request(app.getServer())
        .post("/api/v1/orders")
        .set("Cookie", authCookie)
        .send({ line_items: [{ product_id: productId, quantity: 2 }] });
      expect(response.status).toBe(201);

      // Change the product price AFTER the order was placed.
      await getTestClient().query("UPDATE products SET price_in_cents = $1 WHERE id = $2", [
        orderPrice + 1000,
        productId
      ]);

      // The order_details snapshot must still reflect the price at order time.
      const orderDetails = await getTestClient().query(
        "SELECT unit_price_in_cents FROM order_details WHERE product_id = $1",
        [productId]
      );
      expect(orderDetails.rows).toHaveLength(1);
      expect(orderDetails.rows[0].unit_price_in_cents).toBe(orderPrice);
    });
  });
});
