import App from "app";
import { AuthHttpController } from "./auth.controller";
import request from "supertest";
import { AuthService } from "./auth.service";
import { UsersRepository } from "users/users.repository";
import { UserService } from "users/users.service";
import { getTestClient, registerUserRequest } from "__tests__/setup";
import { createMockDatabaseService } from "__tests__/mocks";
import { RolesRepository } from "roles/roles.repository";
import { StripeService } from "services/stripe.service";
import { ProductRepository } from "products/products.repository";

describe("AuthController", () => {
  let app: App;

  beforeAll(() => {
    const DB = createMockDatabaseService(getTestClient());
    const stripeService = new StripeService(new ProductRepository(DB));
    const authService = new AuthService(
      new UserService(new UsersRepository(DB), new RolesRepository(DB), stripeService)
    );

    app = new App([new AuthHttpController(authService)], []);
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user", async () => {
      const response = await registerUserRequest(app, "testuser");

      expect(response.status).toBe(201);
      expect(response.headers["set-cookie"]).toBeDefined();
      expect(response.body.data.username).toBe("testuser");
    });

    it("should return 400 if user already exists", async () => {
      const response = await registerUserRequest(app, "testuser");
      const response2 = await registerUserRequest(app, "testuser");

      expect(response.status).toBe(201);
      expect(response.headers["set-cookie"]).toBeDefined();
      expect(response.body.data.username).toBe("testuser");

      expect(response2.status).toBe(400);
      expect(response2.body).toHaveProperty("message", "User with that email already exists");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should NOT login a user if user does not exist", async () => {
      const response = await request(app.getServer()).post("/api/v1/auth/login").send({
        email: "testuser@example.com",
        password: "password"
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid email or password");
    });

    it("should NOT login a user if password is incorrect", async () => {
      await registerUserRequest(app, "testuser");

      const response = await request(app.getServer()).post("/api/v1/auth/login").send({
        email: "testuser@example.com",
        password: "invalid-password"
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid email or password");
    });

    it("should login an existing user with correct credentials", async () => {
      await registerUserRequest(app, "testuser");

      const response = await request(app.getServer()).post("/api/v1/auth/login").send({
        email: "testuser@example.com",
        password: "password"
      });

      expect(response.status).toBe(200);
      expect(response.body.data.username).toBe("testuser");
    });
  });
});
