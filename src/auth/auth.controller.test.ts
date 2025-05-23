import App from "app";
import { AuthController } from "./auth.controller";
import request from "supertest";
import pool from "config/database";
import { seedDatabase } from "db/seed";
import { clearAllTables } from "db/setup";

const app = new App([new AuthController()]);

describe("AuthController", () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  afterEach(async () => {
    await clearAllTables();
  });

  afterAll(async () => {
    await pool.end();
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
