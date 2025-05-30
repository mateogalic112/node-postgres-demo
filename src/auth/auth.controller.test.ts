import App from "app";
import { AuthController } from "./auth.controller";
import request from "supertest";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";
import { Client } from "pg";
import { env } from "config/env";

let client: Client;
let app: App;

describe("AuthController", () => {
  beforeAll(async () => {
    client = new Client({
      host: env.POSTGRES_HOST,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      database: env.POSTGRES_DB,
      port: env.POSTGRES_PORT
    });
    await client.connect();

    app = new App([new AuthController(new AuthService(new AuthRepository(client)))]);
  });

  beforeEach(async () => {
    await client.query("TRUNCATE TABLE users, products RESTART IDENTITY CASCADE");
  });

  afterAll(async () => {
    await client.end();
  });

  describe("Register user -> /api/v1/auth/register", () => {
    it("should register a new user", async () => {
      const response = await request(app.app).post("/api/v1/auth/register").send({
        username: "testuser",
        email: "test@example.com",
        password: "password"
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("username", "testuser");
      expect(response.body).toHaveProperty("email", "test@example.com");
      expect(response.headers["set-cookie"]).toBeDefined();
    });

    it("should return 400 if user already exists", async () => {
      await request(app.app).post("/api/v1/auth/register").send({
        username: "testuser",
        email: "test@example.com",
        password: "password"
      });

      const response = await request(app.app).post("/api/v1/auth/register").send({
        username: "testuser",
        email: "test@example.com",
        password: "password"
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message", "User with that email already exists");
    });
  });
});
