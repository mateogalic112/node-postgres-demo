import App from "app";
import { AuthHttpController } from "./auth.controller";
import request from "supertest";
import { AuthService } from "./auth.service";
import { Client } from "pg";
import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { UsersRepository } from "users/users.repository";
import { UserService } from "users/users.service";
import { closeDatabase, prepareDatabase, resetDatabase } from "__tests__/setup";
import { createMockDatabaseService } from "__tests__/mocks";
import { RegisterPayload } from "./auth.validation";

describe("AuthController", () => {
  let client: Client;
  let app: App;
  let postgresContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    const { client: freshClient, postgresContainer: freshContainer } = await prepareDatabase();
    client = freshClient;
    postgresContainer = freshContainer;

    const DB = createMockDatabaseService(client);
    const usersService = new UserService(new UsersRepository(DB));

    app = new App([new AuthHttpController(new AuthService(usersService))], []);
  });

  beforeEach(async () => {
    await resetDatabase(client);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase(client, postgresContainer);
  });

  describe("POST /api/v1/auth/register", () => {
    const payload: RegisterPayload = {
      username: "testuser",
      email: "test@example.com",
      password: "password"
    };

    it("should register a new user", async () => {
      const response = await request(app.getServer()).post("/api/v1/auth/register").send(payload);

      expect(response.status).toBe(201);
      expect(response.headers["set-cookie"]).toBeDefined();
      expect(response.body.data).toMatchObject({
        id: 1,
        username: payload.username,
        email: payload.email
      });
    });

    it("should return 400 if user already exists", async () => {
      const response = await request(app.getServer()).post("/api/v1/auth/register").send(payload);
      const response2 = await request(app.getServer()).post("/api/v1/auth/register").send(payload);

      expect(response.status).toBe(201);
      expect(response2.status).toBe(400);
      expect(response2.body).toHaveProperty("message", "User with that email already exists");
    });
  });
});
