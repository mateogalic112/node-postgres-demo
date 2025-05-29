import App from "app";
import { AuthController } from "./auth.controller";
import request from "supertest";
import pool from "config/database";
import { seedDatabase } from "database/seed";

const app = new App([new AuthController()]);

describe("AuthController", () => {
  beforeAll(async () => {
    // @dev clear all tables before seeding
    await pool.query("TRUNCATE TABLE users, products RESTART IDENTITY CASCADE");
    // @dev seed database
    await seedDatabase();
  });

  afterEach(async () => {
    // @dev clear all tables after each test
    await pool.query("TRUNCATE TABLE users, products RESTART IDENTITY CASCADE");
  });

  afterAll(async () => {
    // @dev close database connection
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
