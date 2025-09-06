import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { createMockDatabaseService } from "__tests__/mocks";
import App from "app";
import { Client } from "pg";
import { UsersHttpController } from "./users.controller";
import { AuthService } from "auth/auth.service";
import { UserService } from "./users.service";
import { UsersRepository } from "./users.repository";
import { closeDatabase, prepareDatabase, resetDatabase } from "__tests__/setup";
import { RolesService } from "roles/roles.service";
import { RolesRepository } from "roles/roles.repository";
import request from "supertest";

describe("UsersController", () => {
  let client: Client;
  let app: App;
  let postgresContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    const { client: freshClient, postgresContainer: freshContainer } = await prepareDatabase();
    client = freshClient;
    postgresContainer = freshContainer;

    const DB = createMockDatabaseService(client);
    const usersService = new UserService(new UsersRepository(DB));
    const authService = new AuthService(usersService);
    const rolesService = new RolesService(new RolesRepository(DB));

    app = new App([new UsersHttpController(authService, rolesService, usersService)], []);
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

  describe("GET /api/v1/users", () => {
    it("should throw an error when NOT authenticated", async () => {
      const response = await request(app.getServer()).get("/api/v1/users");
      expect(response.status).toBe(401);
    });
  });
});
