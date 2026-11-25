import { faker } from "@faker-js/faker";
import { createTestApp, createUser } from "__tests__/setup";
import App from "app";
import request from "supertest";
import { MAX_IMAGE_SIZE_IN_MB } from "./products.validation";
import { embeddingsService, mailService } from "__tests__/mocks";

describe("ProductsController", () => {
  let app: App;

  beforeAll(() => {
    app = createTestApp();
  });

  describe("POST /api/v1/products", () => {
    it("should create a product", async () => {
      const seller = (await createUser("seller")).cookie;

      const response = await request(app.getServer())
        .post("/api/v1/products")
        .set("Cookie", seller)
        .field("name", faker.commerce.productName())
        .field("description", faker.commerce.productDescription())
        .field("price_in_cents", faker.number.int({ min: 100, max: 100000 }));

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBeDefined();
      expect(embeddingsService.generateEmbeddings.mock.calls).toEqual([
        [response.body.data.description]
      ]);
      expect(mailService.sendEmail.mock.calls).toEqual([
        [{ to: "seller@example.com", subject: "New product created", html: expect.any(String) }]
      ]);
    });

    describe("product with image upload", () => {
      let seller: string;

      beforeEach(async () => {
        seller = (await createUser("seller")).cookie;
      });

      const postProduct = () =>
        request(app.getServer())
          .post("/api/v1/products")
          .set("Cookie", seller)
          .field("name", faker.commerce.productName())
          .field("description", faker.commerce.productDescription())
          .field("price_in_cents", faker.number.int({ min: 100, max: 100000 }));

      it.each([
        ["image/jpeg", "photo.jpg"],
        ["image/png", "photo.png"],
        ["image/webp", "photo.webp"]
      ])("should accept %s images", async (contentType, filename) => {
        const response = await postProduct().attach("image", Buffer.from("image-data"), {
          filename,
          contentType
        });

        expect(response.status).toBe(201);
      });

      it.each([
        ["application/pdf", "document.pdf"],
        ["text/plain", "notes.txt"],
        ["image/gif", "animation.gif"],
        ["image/svg+xml", "vector.svg"]
      ])("should reject %s files", async (contentType, filename) => {
        const response = await postProduct().attach("image", Buffer.from("image-data"), {
          filename,
          contentType
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid file format");
      });

      it("should reject files larger than 5MB", async () => {
        const MAX_FILE_SIZE_BYTES = MAX_IMAGE_SIZE_IN_MB * 1024 * 1024;

        const response = await postProduct().attach(
          "image",
          Buffer.alloc(MAX_FILE_SIZE_BYTES + 1),
          { filename: "huge.jpg", contentType: "image/jpeg" }
        );

        expect(response.status).toBe(413);
        expect(response.body.message).toBe("File size too large");
      });
    });
  });
});
