import { faker } from "@faker-js/faker";
import { createTestApp, registerUserRequest, seedProducts } from "__tests__/setup";
import App from "app";
import request from "supertest";

describe("ProductsController", () => {
  let app: App;

  beforeAll(() => {
    app = createTestApp();
  });

  describe("GET /api/v1/products", () => {
    it("should return paginated products WITH next cursor", async () => {
      const owner = await registerUserRequest(app, "owner");
      await seedProducts(21, owner.body.data.id);

      const response = await request(app.getServer()).get("/api/v1/products").query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10);
      expect(response.body.nextCursor.id).toBe(10);
    });

    it("should return paginated products WITHOUT next cursor", async () => {
      const owner = await registerUserRequest(app, "owner");
      await seedProducts(8, owner.body.data.id);

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
      const userResponse = await registerUserRequest(app, "testuser");
      const productName = faker.commerce.productName();

      const response = await request(app.getServer())
        .post("/api/v1/products")
        .set("Cookie", userResponse.headers["set-cookie"][0])
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
