import App from "app";
import { AuthHttpController } from "./auth.controller";
import request from "supertest";
import { AuthService } from "./auth.service";
import { Client, PoolClient } from "pg";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { UsersRepository } from "users/users.repository";
import { UserService } from "users/users.service";
import { migrate } from "database/setup";
import { DatabaseService } from "interfaces/database.interface";

describe("AuthController", () => {
  jest.setTimeout(60000);

  let client: Client;
  let app: App;
  let postgresContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    // @dev Start the postgres container
    postgresContainer = await new PostgreSqlContainer("postgres:15").start();

    // @dev Connect to the database
    client = new Client({ connectionString: postgresContainer.getConnectionUri() });
    await client.connect();

    // @dev Run migrations
    await migrate(client);

    const DB: DatabaseService = {
      query: client.query.bind(client),
      getClient: async () => ({ ...client, release: client.end }) as unknown as PoolClient
    };

    app = new App(
      [new AuthHttpController(new AuthService(new UserService(new UsersRepository(DB))))],
      []
    );
  });

  beforeEach(async () => {
    await client.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE");
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    try {
      await client.end();
    } catch (error) {
      console.warn("Error ending client:", error);
    }

    try {
      await postgresContainer.stop({ timeout: 1000 });
    } catch (error) {
      console.warn("Error stopping container:", error);
    }
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
