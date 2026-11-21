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
    const PAGE_SIZE = 10;

    it.each([
      [{ total: PAGE_SIZE + 5, hasNextCursor: true }],
      [{ total: PAGE_SIZE, hasNextCursor: true }],
      [{ total: PAGE_SIZE - 5, hasNextCursor: false }]
    ])("should return paginated products", async ({ total, hasNextCursor }) => {
      const owner = await registerUserRequest(app, "owner");
      await seedProducts(total, owner.body.data.id);

      const response = await request(app.getServer())
        .get("/api/v1/products")
        .query({ limit: PAGE_SIZE });

      expect(response.body.data.length).toBeLessThanOrEqual(PAGE_SIZE);
      if (hasNextCursor) {
        expect(response.body.nextCursor).toHaveProperty("id");
      } else {
        expect(response.body.nextCursor).toBeNull();
      }
    });
  });

  describe("POST /api/v1/products", () => {
    it("should create a product", async () => {
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
