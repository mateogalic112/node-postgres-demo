import { faker } from "@faker-js/faker/.";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import App from "app";
import { createMockedAuctionPayload } from "auctions/mocks/auction.mocks";
import { migrate } from "database/setup";
import { Client } from "pg";
import { Role } from "roles/roles.validation";
import request from "supertest";
import { User } from "users/users.validation";
import bcrypt from "bcrypt";

const createDbInitialState = async (client: Client) => {
  // Insert default roles
  const rolesResult = await client.query<Role>(
    `INSERT INTO roles (name, description) VALUES ('admin', 'Admin role'), ('user', 'User role') RETURNING *`
  );

  // Insert default admin user with hashed password
  const adminUserResult = await client.query<User>(
    `INSERT INTO users (username, email, password) VALUES ('admin', 'admin@example.com', $1) RETURNING *`,
    [await bcrypt.hash("password", 10)]
  );

  // Insert default admin user role
  await client.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
    adminUserResult.rows[0].id,
    rolesResult.rows[0].id
  ]);

  return {
    adminUser: { ...adminUserResult.rows[0], password: "password" }, // Return plain text password for tests
    roles: rolesResult.rows
  };
};

export const prepareDatabase = async () => {
  // @dev Start the postgres container
  const postgresContainer = await new PostgreSqlContainer("postgres:15").start();

  // @dev Connect to the database
  const client = new Client({ connectionString: postgresContainer.getConnectionUri() });
  await client.connect();

  // @dev Run migrations
  await migrate(client);

  const { adminUser, roles } = await createDbInitialState(client);

  return {
    client,
    postgresContainer,
    adminUser,
    roles
  };
};

export const closeDatabase = async (
  client: Client,
  postgresContainer: StartedPostgreSqlContainer
) => {
  try {
    await client.end();
  } catch (error) {
    console.warn("Error ending client:", error);
  }

  try {
    await postgresContainer.stop({ timeout: 1000 });
  } catch (error) {
    console.warn("Error stopping container:", error);
  }
};

export const resetDatabase = async (client: Client) => {
  await client.query(`
    TRUNCATE TABLE
      bids,
      auctions,
      products,
      users,
      user_roles,
      roles
    RESTART IDENTITY CASCADE
  `);

  await createDbInitialState(client);
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
