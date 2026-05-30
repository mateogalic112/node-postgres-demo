import { faker } from "@faker-js/faker";
import App from "app";
import { Client } from "pg";
import request from "supertest";
import { TEST_ADMIN_USER } from "./constants";

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

export const seedProducts = async (count: number) => {
  const client = getTestClient();

  const owner = await client.query<{ id: number }>("SELECT id FROM users WHERE email = $1", [
    TEST_ADMIN_USER.email
  ]);
  if (owner.rowCount === 0) {
    throw new Error(`Cannot seed products: no user found for email ${TEST_ADMIN_USER.email}`);
  }

  const values: unknown[] = [];
  const rows: string[] = [];
  for (let i = 0; i < count; i++) {
    const offset = i * 4;
    rows.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
    values.push(
      faker.commerce.productName(),
      faker.commerce.productDescription(),
      faker.number.int({ min: 100, max: 100000 }),
      owner.rows[0].id
    );
  }

  const result = await client.query<{ id: number }>(
    `INSERT INTO products (name, description, price_in_cents, owner_id)
     VALUES ${rows.join(", ")}
     RETURNING id`,
    values
  );
  return result.rows;
};
