import { paymentsService } from "__tests__/mocks";
import {
  createProductRequest,
  createTestApp,
  db,
  getAuthCookieAfterRegister
} from "__tests__/setup";
import App from "app";
import request from "supertest";

describe("OrdersController", () => {
  let app: App;

  beforeAll(() => {
    app = createTestApp();
  });

  describe("POST /api/v1/orders", () => {
    it("should throw an error when NOT authenticated", async () => {
      const response = await request(app.getServer()).post("/api/v1/orders");
      expect(response.status).toBe(401);
    });

    it("should throw an error when customer creation fails", async () => {
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
      await db.query("UPDATE products SET price_in_cents = $1 WHERE id = $2", [
        orderPrice + 1000,
        productId
      ]);

      // The order_details snapshot must still reflect the price at order time.
      const orderDetails = await db.query(
        "SELECT unit_price_in_cents FROM order_details WHERE product_id = $1",
        [productId]
      );
      expect(orderDetails.rows).toHaveLength(1);
      expect(orderDetails.rows[0].unit_price_in_cents).toBe(orderPrice);
    });

    it("should send checkout the line items priced from the order snapshot", async () => {
      const authCookie = await getAuthCookieAfterRegister(app, "testuser");
      const product = (await createProductRequest(app, authCookie)).body.data;

      const response = await request(app.getServer())
        .post("/api/v1/orders")
        .set("Cookie", authCookie)
        .send({ line_items: [{ product_id: product.id, quantity: 2 }] });
      expect(response.status).toBe(201);

      expect(paymentsService.createCheckoutSession).toHaveBeenLastCalledWith(
        expect.any(Number),
        [
          {
            product_id: product.id,
            name: product.name,
            description: product.description,
            image_url: product.image_url,
            quantity: 2,
            price_in_cents: product.price_in_cents
          }
        ],
        "cus_test123"
      );
    });
  });
});
