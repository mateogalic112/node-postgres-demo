import { createTestApp } from "__tests__/setup";
import App from "app";
import request from "supertest";

describe("AuthController", () => {
  let app: App;

  beforeAll(() => {
    app = createTestApp();
  });

  const registerRequest = (username: string) =>
    request(app.getServer())
      .post("/api/v1/auth/register")
      .send({ username, email: `${username}@example.com`, password: "password" });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user", async () => {
      const response = await registerRequest("testuser");

      expect(response.status).toBe(201);
      expect(response.headers["set-cookie"]).toBeDefined();
      expect(response.body.data).toMatchObject({
        username: "testuser",
        password: "RESTRICTED"
      });
    });

    it("should return 400 if user already exists", async () => {
      await registerRequest("testuser");
      const response = await registerRequest("testuser");

      expect(response.status).toBe(400);
      expect(response.headers["set-cookie"]).toBeUndefined();
      expect(response.body).toHaveProperty("message", "Resource already exists");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should return 400 if user does not exist", async () => {
      const response = await request(app.getServer()).post("/api/v1/auth/login").send({
        email: "testuser@example.com",
        password: "password"
      });

      expect(response.status).toBe(400);
      expect(response.headers["set-cookie"]).toBeUndefined();
      expect(response.body.message).toBe("Invalid credentials");
    });

    it("should return 400 if password is incorrect", async () => {
      await registerRequest("testuser");

      const response = await request(app.getServer()).post("/api/v1/auth/login").send({
        email: "testuser@example.com",
        password: "invalid-password"
      });

      expect(response.status).toBe(400);
      expect(response.headers["set-cookie"]).toBeUndefined();
      expect(response.body.message).toBe("Invalid credentials");
    });

    it("should login a user with correct credentials", async () => {
      await registerRequest("testuser");

      const response = await request(app.getServer()).post("/api/v1/auth/login").send({
        email: "testuser@example.com",
        password: "password"
      });

      expect(response.status).toBe(200);
      expect(response.headers["set-cookie"]).toBeDefined();
      expect(response.body.data).toMatchObject({
        username: "testuser",
        password: "RESTRICTED"
      });
    });
  });
});
