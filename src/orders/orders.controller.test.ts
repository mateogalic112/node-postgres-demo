import App from "app";
import { Client } from "pg";
import request from "supertest";
import { AuthHttpController } from "auth/auth.controller";
import { AuthService } from "auth/auth.service";
import { UsersRepository } from "users/users.repository";
import { UserService } from "users/users.service";
import { createMockDatabaseService, mailService } from "__tests__/mocks";
import { closeDatabase, prepareDatabase, resetDatabase } from "__tests__/setup";
import { RolesRepository } from "roles/roles.repository";
import { StripeService } from "services/stripe.service";
import { OrderHttpController } from "./orders.controller";
import { OrderService } from "./orders.service";
import { OrderRepository } from "./orders.repository";

describe("OrdersController", () => {
  let client: Client;
  let app: App;

  beforeAll(async () => {
    const { client: freshClient } = await prepareDatabase();
    client = freshClient;

    const DB = createMockDatabaseService(client);
    const usersService = new UserService(
      new UsersRepository(DB),
      new RolesRepository(DB),
      StripeService.getInstance()
    );
    const authService = new AuthService(usersService);
    const orderService = new OrderService(new OrderRepository(DB), mailService);

    app = new App(
      [
        new AuthHttpController(authService),
        new OrderHttpController(
          authService,
          usersService,
          orderService,
          StripeService.getInstance()
        )
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

  describe("POST /api/v1/orders", () => {
    it("should throw an error when NOT authenticated", async () => {
      const response = await request(app.getServer()).post("/api/v1/orders");
      expect(response.status).toBe(401);
    });
  });
});
