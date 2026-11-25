import { paymentsService } from "__tests__/mocks";
import { createProduct, createTestApp, db, createUser } from "__tests__/setup";
import App from "app";
import request from "supertest";

describe("OrdersController", () => {
  let app: App;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createOrderRequest = (authCookie: string, productId: number, quantity = 2) =>
    request(app.getServer())
      .post("/api/v1/orders")
      .set("Cookie", authCookie)
      .send({ line_items: [{ product_id: productId, quantity }] });

  const checkoutRequest = (authCookie: string, orderId: number) =>
    request(app.getServer()).post(`/api/v1/orders/${orderId}/checkout`).set("Cookie", authCookie);

  const createOrderForNewUser = async (username: string) => {
    const { id, cookie: authCookie } = await createUser(username);
    const product = await createProduct(id);
    const order = (await createOrderRequest(authCookie, product.id)).body.data;
    return { authCookie, product, order };
  };

  describe("POST /api/v1/orders", () => {
    it("should throw an error when NOT authenticated", async () => {
      const response = await request(app.getServer()).post("/api/v1/orders");
      expect(response.status).toBe(401);
    });

    it("should create an order with its details when authenticated", async () => {
      const { id, cookie: authCookie } = await createUser("testuser");
      const product = await createProduct(id);

      const response = await createOrderRequest(authCookie, product.id);

      expect(response.status).toBe(201);
      expect(response.body.data.id).toEqual(expect.any(Number));
      expect(response.body.data.order_details).toEqual([
        expect.objectContaining({
          product_id: product.id,
          quantity: 2,
          unit_price_in_cents: product.price_in_cents
        })
      ]);
      expect(paymentsService.pay).not.toHaveBeenCalled();
    });

    it("should freeze the line item price even if the product price later changes", async () => {
      const { id, cookie: authCookie } = await createUser("testuser");
      const { id: productId, price_in_cents: orderPrice } = await createProduct(id);

      const response = await createOrderRequest(authCookie, productId);
      expect(response.status).toBe(201);

      await db.query("UPDATE products SET price_in_cents = $1 WHERE id = $2", [
        orderPrice + 1000,
        productId
      ]);

      const orderDetails = await db.query(
        "SELECT unit_price_in_cents FROM order_details WHERE product_id = $1",
        [productId]
      );
      expect(orderDetails.rows).toHaveLength(1);
      expect(orderDetails.rows[0].unit_price_in_cents).toBe(orderPrice);
    });
  });

  describe("POST /api/v1/orders/:id/checkout", () => {
    it("should throw an error when NOT authenticated", async () => {
      const response = await request(app.getServer()).post("/api/v1/orders/1/checkout");
      expect(response.status).toBe(401);
    });

    it("should throw an error when customer creation fails", async () => {
      const { authCookie, order } = await createOrderForNewUser("testuser");
      paymentsService.createCustomer.mockResolvedValueOnce(null);

      const response = await checkoutRequest(authCookie, order.id);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Payment service failed to create new customer!");
    });

    it("should throw an error when checkout session is not created", async () => {
      const { authCookie, order } = await createOrderForNewUser("testuser");
      paymentsService.pay.mockResolvedValueOnce(null);

      const response = await checkoutRequest(authCookie, order.id);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Checkout session couldn't be created!");
    });

    it("should return the checkout url", async () => {
      const { authCookie, order } = await createOrderForNewUser("testuser");

      const response = await checkoutRequest(authCookie, order.id);

      expect(response.status).toBe(201);
      expect(response.body.data.url).toBe("https://checkout.stripe.com/test");
    });

    it("should reuse the existing stripe customer on repeated checkouts", async () => {
      const { authCookie, order } = await createOrderForNewUser("testuser");

      await checkoutRequest(authCookie, order.id);
      const response = await checkoutRequest(authCookie, order.id);

      expect(response.status).toBe(201);
      expect(paymentsService.createCustomer).toHaveBeenCalledTimes(1);
    });

    it("should send checkout the line items priced from the order snapshot", async () => {
      const { authCookie, product, order } = await createOrderForNewUser("testuser");

      const response = await checkoutRequest(authCookie, order.id);
      expect(response.status).toBe(201);

      expect(paymentsService.pay).toHaveBeenLastCalledWith({
        orderId: order.id,
        lineItems: [
          {
            product_id: product.id,
            name: product.name,
            description: product.description,
            image_url: product.image_url,
            quantity: 2,
            price_in_cents: product.price_in_cents
          }
        ],
        customerId: "cus_test123"
      });
    });
  });
});
