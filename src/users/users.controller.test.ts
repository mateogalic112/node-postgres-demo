import {
  createTestApp,
  getAdminAuthCookie,
  getAuthCookieAfterRegister,
  registerUserRequest
} from "__tests__/setup";
import App from "app";
import request from "supertest";

describe("UsersController", () => {
  let app: App;

  beforeAll(() => {
    app = createTestApp();
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
      for (let i = 0; i < 21; i++) {
        await registerUserRequest(app, `mocked-user-${i}`);
      }

      const authCookie = await getAdminAuthCookie(app);

      const response = await request(app.getServer())
        .get("/api/v1/users")
        .query({ limit: 10 })
        .set("Cookie", authCookie);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(10);
      expect(response.body.data[0]).toHaveProperty("password", "RESTRICTED");
      const expectedNextCursorId = response.body.data[9].id;
      expect(response.body.nextCursor).toMatchObject({ id: expectedNextCursorId });
    });

    it("should return paginated users without next cursor", async () => {
      for (let i = 0; i < 8; i++) {
        await registerUserRequest(app, `mocked-user-${i}`);
      }

      const authCookie = await getAdminAuthCookie(app);

      const response = await request(app.getServer())
        .get("/api/v1/users")
        .query({ limit: 10 })
        .set("Cookie", authCookie);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(9); // 8 users + the admin
      expect(response.body.nextCursor).toBeNull();
    });
  });
});
