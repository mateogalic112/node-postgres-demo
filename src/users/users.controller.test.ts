import { createTestApp, getAdminAuthCookie, registerUserRequest } from "__tests__/setup";
import App from "app";
import request from "supertest";

describe("UsersController", () => {
  let app: App;

  beforeAll(() => {
    app = createTestApp();
  });

  describe("GET /api/v1/users", () => {
    const PAGE_SIZE = 10;

    it.each([
      [{ totalUsers: PAGE_SIZE + 5, hasNextCursor: true }],
      // We already have admin user from global setup, that's why -1
      [{ totalUsers: PAGE_SIZE - 1, hasNextCursor: true }],
      [{ totalUsers: PAGE_SIZE - 5, hasNextCursor: false }]
    ])("should return paginated users", async ({ totalUsers, hasNextCursor }) => {
      for (let i = 0; i < totalUsers; i++) {
        await registerUserRequest(app, `mocked-user-${i}`);
      }

      const authCookie = await getAdminAuthCookie(app);
      const response = await request(app.getServer())
        .get("/api/v1/users")
        .query({ limit: PAGE_SIZE })
        .set("Cookie", authCookie);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(PAGE_SIZE);
      expect(response.body.data[0]).toHaveProperty("password", "RESTRICTED");

      if (hasNextCursor) {
        expect(response.body.nextCursor).toHaveProperty("id");
      } else {
        expect(response.body.nextCursor).toBeNull();
      }
    });
  });
});
