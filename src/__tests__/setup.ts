import { faker } from "@faker-js/faker/.";
import App from "app";
import { createMockedAuctionPayload } from "auctions/mocks/auction.mocks";
import { Client } from "pg";
import { Role } from "roles/roles.validation";
import request from "supertest";
import { User } from "users/users.validation";

const getDbInitialState = async (client: Client) => {
  // Fetch existing roles (created in global setup)
  const rolesResult = await client.query<Role>(
    `SELECT * FROM roles WHERE name IN ('admin', 'user') ORDER BY name`
  );

  // Fetch existing admin user (created in global setup)
  const adminUserResult = await client.query<User>(
    `SELECT * FROM users WHERE email = 'admin@example.com'`
  );

  return {
    adminUser: { ...adminUserResult.rows[0], password: "password" }, // Return plain text password for tests
    roles: rolesResult.rows
  };
};

export const prepareDatabase = async () => {
  // Use the shared PostgreSQL container from global setup
  const connectionString = (globalThis as Record<string, unknown>).__POSTGRES_URI__ as string;

  if (!connectionString) {
    throw new Error(
      "PostgreSQL container not found. Make sure globalSetup is configured correctly."
    );
  }

  // Connect to the shared database
  const client = new Client({ connectionString });
  await client.connect();

  // Get existing initial state (roles and admin user created in global setup)
  const { adminUser, roles } = await getDbInitialState(client);

  return {
    client,
    adminUser,
    roles
  };
};

export const closeDatabase = async (client: Client) => {
  try {
    await client.end();
  } catch (error) {
    console.warn("Error ending client:", error);
  }
};

export const resetDatabase = async (client: Client) => {
  // Only truncate tables that are populated during tests, keep the initial state
  await client.query(`
    TRUNCATE TABLE
      bids,
      auctions,
      products
    RESTART IDENTITY CASCADE
  `);

  // Delete any users except the admin user
  await client.query(`DELETE FROM users WHERE email != 'admin@example.com'`);
};

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
    .field("description", faker.commerce.productDescription());
};

export const createAuctionRequest = async (app: App, authCookie: string, productId: number) => {
  const mockedAuctionPayload = createMockedAuctionPayload(productId);

  return request(app.getServer())
    .post("/api/v1/auctions")
    .set("Cookie", authCookie)
    .send(mockedAuctionPayload);
};
