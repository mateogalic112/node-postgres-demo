import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import App from "app";
import { Client } from "pg";
import { ProductController } from "./products.controller";
import { ProductService } from "./products.service";
import { ProductRepository } from "./products.repository";
import request from "supertest";
import { CreateProductPayload } from "./products.validation";
import { faker } from "@faker-js/faker/.";
import { AuthController } from "auth/auth.controller";
import { AuthService } from "auth/auth.service";
import { UsersRepository } from "users/users.repository";
import { FilesService } from "interfaces/files.interface";
import { MailService } from "interfaces/mail.interface";
import { UserService } from "users/users.service";

describe("ProductsController", () => {
  jest.setTimeout(60000);

  let client: Client;
  let app: App;
  let postgresContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer("postgres:15").start();

    client = new Client({ connectionString: postgresContainer.getConnectionUri() });
    await client.connect();

    await client.query(
      `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100),
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100),
        description TEXT,
        price INT,
        image_url VARCHAR(2048) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`
    );

    const filesService: FilesService = {
      uploadFile: jest.fn().mockResolvedValue("https://example.com/image.jpg")
    };

    const mailService: MailService = {
      sendEmail: jest.fn().mockResolvedValue("123e4567-e89b-12d3-a456-426614174000")
    };

    const authService = new AuthService(new UserService(new UsersRepository(client)));
    const authController = new AuthController(authService);

    const productService = new ProductService(
      new ProductRepository(client),
      mailService,
      filesService
    );

    app = new App([authController, new ProductController(productService, authService)]);
  });

  beforeEach(async () => {
    await client.query("TRUNCATE TABLE users, products RESTART IDENTITY CASCADE");
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await client.end();
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
          price: +faker.commerce.price({ min: 1000, max: 100000, dec: 0 }),
          image_url: faker.image.url()
        }));

      for (const { name, description, price, image_url } of products) {
        await client.query(
          `INSERT INTO products (name, description, price, image_url, owner_id) VALUES ($1, $2, $3, $4, $5)`,
          [name, description, price, image_url, user.rows[0].id]
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
          price: +faker.commerce.price({ min: 1000, max: 100000, dec: 0 }),
          image_url: faker.image.url()
        }));

      for (const { name, description, price, image_url } of products) {
        await client.query(
          `INSERT INTO products (name, description, price, image_url, owner_id) VALUES ($1, $2, $3, $4, $5)`,
          [name, description, price, image_url, user.rows[0].id]
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
        price: +faker.commerce.price({ min: 1000, max: 100000, dec: 0 }),
        image_url: null
      };

      const mockImageBuffer = Buffer.from("fake-image-data");

      const response = await request(app.getServer())
        .post("/api/v1/products")
        .set("Cookie", authCookie)
        .field("name", payload.name)
        .field("description", payload.description)
        .field("price", payload.price)
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
        price: +faker.commerce.price({ min: 1000, max: 100000, dec: 0 }),
        image_url: faker.image.url()
      };

      const response = await request(app.getServer()).post("/api/v1/products").send(payload);
      expect(response.status).toBe(401);
    });
  });
});
