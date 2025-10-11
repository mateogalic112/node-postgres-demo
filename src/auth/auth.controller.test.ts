import App from "app";
import { AuthHttpController } from "./auth.controller";
import request from "supertest";
import { AuthService } from "./auth.service";
import { Client } from "pg";
import { UsersRepository } from "users/users.repository";
import { UserService } from "users/users.service";
import {
  closeDatabase,
  prepareDatabase,
  registerUserRequest,
  resetDatabase
} from "__tests__/setup";
import { createMockDatabaseService } from "__tests__/mocks";
import { createMockedLoginPayload, createMockedRegisterPayload } from "./mocks/auth.mocks";
import { RolesRepository } from "roles/roles.repository";

describe("AuthController", () => {
  let client: Client;
  let app: App;

  beforeAll(async () => {
    const { client: freshClient } = await prepareDatabase();
    client = freshClient;

    const DB = createMockDatabaseService(client);
    const authService = new AuthService(
      new UserService(new UsersRepository(DB, new RolesRepository(DB)))
    );

    app = new App([new AuthHttpController(authService)], []);
  });

  beforeEach(async () => {
    await resetDatabase(client);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase(client);
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user", async () => {
      const mockedRegisterPayload = createMockedRegisterPayload("testuser", "password");

      const response = await request(app.getServer())
        .post("/api/v1/auth/register")
        .send(mockedRegisterPayload);

      expect(response.status).toBe(201);
      expect(response.headers["set-cookie"]).toBeDefined();
      expect(response.body.data.username).toBe(mockedRegisterPayload.username);
    });

    it("should return 400 if user already exists", async () => {
      const mockedRegisterPayload = createMockedRegisterPayload("testuser", "password");

      const response = await request(app.getServer())
        .post("/api/v1/auth/register")
        .send(mockedRegisterPayload);

      const response2 = await request(app.getServer())
        .post("/api/v1/auth/register")
        .send(mockedRegisterPayload);

      expect(response.status).toBe(201);
      expect(response.headers["set-cookie"]).toBeDefined();
      expect(response.body.data.username).toBe(mockedRegisterPayload.username);

      expect(response2.status).toBe(400);
      expect(response2.body).toHaveProperty("message", "User with that email already exists");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should NOT login a user if user does not exist", async () => {
      const mockedLoginPayload = createMockedLoginPayload("testuser", "password");

      const response = await request(app.getServer())
        .post("/api/v1/auth/login")
        .send(mockedLoginPayload);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid email or password");
    });

    it("should NOT login a user if password is incorrect", async () => {
      const mockedRegisterPayload = createMockedRegisterPayload("testuser", "password");
      await registerUserRequest(app, mockedRegisterPayload.username);

      const mockedLoginPayload = createMockedLoginPayload("testuser", "invalid-password");
      const response = await request(app.getServer())
        .post("/api/v1/auth/login")
        .send(mockedLoginPayload);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid email or password");
    });

    it("should login an existing user with correct credentials", async () => {
      const username = "testuser";
      await registerUserRequest(app, username);

      const mockedLoginPayload = createMockedLoginPayload(username, "password");
      const response = await request(app.getServer())
        .post("/api/v1/auth/login")
        .send(mockedLoginPayload);

      expect(response.status).toBe(200);
      expect(response.body.data.username).toBe(username);
    });
  });
});
