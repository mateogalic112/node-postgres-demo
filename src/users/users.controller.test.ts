import { createMockDatabaseService } from "__tests__/mocks";
import App from "app";
import { Client } from "pg";
import { UsersHttpController } from "./users.controller";
import { AuthService } from "auth/auth.service";
import { UserService } from "./users.service";
import { UsersRepository } from "./users.repository";
import {
  closeDatabase,
  getAuthCookieAfterRegister,
  loginUserRequest,
  prepareDatabase,
  resetDatabase
} from "__tests__/setup";
import { RolesService } from "roles/roles.service";
import { RolesRepository } from "roles/roles.repository";
import request from "supertest";
import { AuthHttpController } from "auth/auth.controller";
import { bulkInsertUsers } from "./mocks/users.mocks";
import { User } from "./users.validation";
import { StripeService } from "services/stripe.service";

describe("UsersController", () => {
  let client: Client;
  let app: App;
  let adminUser: User;

  beforeAll(async () => {
    const { client: freshClient, adminUser: freshAdminUser } = await prepareDatabase();

    client = freshClient;
    adminUser = freshAdminUser;

    const DB = createMockDatabaseService(client);
    const usersService = new UserService(
      new UsersRepository(DB),
      new RolesRepository(DB),
      StripeService.getInstance()
    );
    const authService = new AuthService(usersService);
    const rolesService = new RolesService(new RolesRepository(DB));

    app = new App(
      [
        new AuthHttpController(authService),
        new UsersHttpController(authService, rolesService, usersService)
      ],
      []
    );
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

  describe("GET /api/v1/users", () => {
    it("should throw an error when NOT authenticated", async () => {
      const response = await request(app.getServer()).get("/api/v1/users");
      expect(response.status).toBe(401);
    });

    it("should throw an error when NOT authorized", async () => {
      const authCookie = await getAuthCookieAfterRegister(app, "testuser");
      const response = await request(app.getServer())
        .get("/api/v1/users")
        .set("Cookie", authCookie);
      expect(response.status).toBe(403);
    });

    it("should return paginated users with next cursor", async () => {
      await bulkInsertUsers(app, 21);

      const userResponse = await loginUserRequest(app, adminUser.email, adminUser.password);
      const authCookie = userResponse.headers["set-cookie"][0];

      const response = await request(app.getServer())
        .get("/api/v1/users")
        .query({ limit: 10 })
        .set("Cookie", authCookie);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10);
      // The nextCursor should be the ID of the 10th user in the response
      const expectedNextCursorId = response.body.data[9].id; // 0-indexed, so 9th element is 10th user
      expect(response.body.nextCursor).toMatchObject({ id: expectedNextCursorId });
    });

    it("should return paginated users without next cursor", async () => {
      await bulkInsertUsers(app, 8);

      const userResponse = await loginUserRequest(app, adminUser.email, adminUser.password);

      const authCookie = userResponse.headers["set-cookie"][0];

      const response = await request(app.getServer())
        .get("/api/v1/users")
        .query({ limit: 10 })
        .set("Cookie", authCookie);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(9); // 8 users + 1 admin user
      expect(response.body.nextCursor).toBeNull();
    });
  });
});
