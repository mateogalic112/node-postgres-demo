import { faker } from "@faker-js/faker";
import App from "app";
import { createMockedAuctionPayload } from "auctions/mocks/auction.mocks";
import { Client } from "pg";
import request from "supertest";
import { User } from "users/users.validation";

// Helper to get shared test state from jestSetup.ts
export const getTestClient = (): Client => {
  const client = (globalThis as Record<string, unknown>).__TEST_CLIENT__;
  if (!client) {
    throw new Error("Test client not initialized. Ensure jestSetup.ts has run.");
  }
  return client as Client;
};

export const getTestAdminUser = (): User & { password: string } => {
  const adminUser = (globalThis as Record<string, unknown>).__TEST_ADMIN_USER__;
  if (!adminUser) {
    throw new Error("Test admin user not initialized. Ensure jestSetup.ts has run.");
  }
  return adminUser as User & { password: string };
};

// Request helpers
export const registerUserRequest = async (app: App, username: string) => {
  return request(app.getServer())
    .post("/api/v1/auth/register")
    .send({
      username,
      email: `${username}@example.com`,
      password: "password"
    });
};

export const loginUserRequest = async (app: App, email: string, password: string) => {
  return request(app.getServer()).post("/api/v1/auth/login").send({
    email,
    password
  });
};

export const getAuthCookieAfterRegister = async (app: App, username: string) => {
  const userResponse = await registerUserRequest(app, username);
  return userResponse.headers["set-cookie"][0];
};

export const createProductRequest = async (app: App, authCookie: string) => {
  return request(app.getServer())
    .post("/api/v1/products")
    .set("Cookie", authCookie)
    .field("name", faker.commerce.productName())
    .field("description", faker.commerce.productDescription())
    .field("price_in_cents", faker.number.int({ min: 100, max: 100000 }));
};

export const createAuctionRequest = async (app: App, authCookie: string, productId: number) => {
  const mockedAuctionPayload = createMockedAuctionPayload(productId);

  return request(app.getServer())
    .post("/api/v1/auctions")
    .set("Cookie", authCookie)
    .send(mockedAuctionPayload);
};
