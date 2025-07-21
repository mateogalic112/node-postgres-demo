import { faker } from "@faker-js/faker/.";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import App from "app";
import { migrate } from "database/setup";
import { Client } from "pg";
import { Product } from "products/products.validation";
import request from "supertest";

export const prepareDatabase = async () => {
  // @dev Start the postgres container
  const postgresContainer = await new PostgreSqlContainer("postgres:15").start();

  // @dev Connect to the database
  const client = new Client({ connectionString: postgresContainer.getConnectionUri() });
  await client.connect();

  // @dev Run migrations
  await migrate(client);

  return { client, postgresContainer };
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
      users
    RESTART IDENTITY CASCADE
  `);
};

export const getAuthCookie = async (app: App) => {
  const userResponse = await request(app.getServer()).post("/api/v1/auth/register").send({
    username: "testuser",
    email: "test@example.com",
    password: "password"
  });

  return userResponse.headers["set-cookie"][0];
};

export const createProduct = async (app: App, authCookie: string): Promise<Product> => {
  const productResponse = await request(app.getServer())
    .post("/api/v1/products")
    .set("Cookie", authCookie)
    .field("name", faker.commerce.productName())
    .field("description", faker.commerce.productDescription());

  return productResponse.body.data;
};
