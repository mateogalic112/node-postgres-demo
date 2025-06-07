import App from "app";
import { AuthController } from "./auth.controller";
import request from "supertest";
import { AuthService } from "./auth.service";
import { Client } from "pg";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { UsersRepository } from "users/users.repository";
import { UserService } from "users/users.service";

describe("AuthController", () => {
  jest.setTimeout(60000);

  let client: Client;
  let app: App;
  let postgresContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer("postgres:15").start();

    client = new Client({ connectionString: postgresContainer.getConnectionUri() });
    await client.connect();

    await client.query(
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100),
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );

    app = new App(
      [new AuthController(new AuthService(new UserService(new UsersRepository(client))))],
      []
    );
  });

  beforeEach(async () => {
    await client.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE");
  });

  afterAll(async () => {
    await client.end();
  });

  describe("Register user -> /api/v1/auth/register", () => {
    it("should register a new user", async () => {
      const response = await request(app.getServer()).post("/api/v1/auth/register").send({
        username: "testuser",
        email: "test@example.com",
        password: "password"
      });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        id: expect.any(Number),
        username: "testuser",
        email: "test@example.com"
      });
      expect(response.headers["set-cookie"]).toBeDefined();
    });

    it("should return 400 if user already exists", async () => {
      await request(app.getServer()).post("/api/v1/auth/register").send({
        username: "testuser",
        email: "test@example.com",
        password: "password"
      });

      const response = await request(app.getServer()).post("/api/v1/auth/register").send({
        username: "testuser",
        email: "test@example.com",
        password: "password"
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message", "User with that email already exists");
    });
  });
});
