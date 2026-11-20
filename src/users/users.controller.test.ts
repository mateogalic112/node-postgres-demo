import { createTestApp, getAdminAuthCookie, registerUserRequest } from "__tests__/setup";
import App from "app";
import request from "supertest";

describe("UsersController", () => {
  let app: App;

  beforeAll(() => {
    app = createTestApp();
  });

  describe("GET /api/v1/users", () => {
    it.each([
      [{ totalUsers: 21, currentCount: 10, nextCursor: (id: number) => ({ id }) }],
      [{ totalUsers: 8, currentCount: 9, nextCursor: () => null }]
    ])("should return paginated users", async ({ totalUsers, currentCount, nextCursor }) => {
      for (let i = 0; i < totalUsers; i++) {
        await registerUserRequest(app, `mocked-user-${i}`);
      }

      const authCookie = await getAdminAuthCookie(app);
      const response = await request(app.getServer())
        .get("/api/v1/users")
        .query({ limit: 10 })
        .set("Cookie", authCookie);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(currentCount);
      expect(response.body.data[0]).toHaveProperty("password", "RESTRICTED");
      expect(response.body.nextCursor).toEqual(nextCursor(response.body.data[9]?.id));
    });
  });
});
