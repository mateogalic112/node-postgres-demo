import { faker } from "@faker-js/faker";
import App from "app";
import { Client } from "pg";
import request from "supertest";

// Helper to get shared test state from jestSetup.ts
export const getTestClient = (): Client => {
  const client = (globalThis as Record<string, unknown>).__TEST_CLIENT__;
  if (!client) {
    throw new Error("Test client not initialized. Ensure jestSetup.ts has run.");
  }
  return client as Client;
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
