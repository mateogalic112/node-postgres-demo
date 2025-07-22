import { faker } from "@faker-js/faker/.";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import App from "app";
import { Auction, CreateAuctionPayload } from "auctions/auctions.validation";
import { migrate } from "database/setup";
import { addDays } from "date-fns";
import { Client } from "pg";
import { Product } from "products/products.validation";
import request from "supertest";
import { User } from "users/users.validation";

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

export const createUser = async (client: Client) => {
  const user = await client.query(
    "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
    ["testuser", "test@example.com", "password"]
  );
  return user.rows[0];
};

export const createProduct = async (client: Client, user: User) => {
  const product = await client.query(
    "INSERT INTO products (name, description, image_url, owner_id) VALUES ($1, $2, $3, $4) RETURNING *",
    [faker.commerce.productName(), faker.commerce.productDescription(), faker.image.url(), user.id]
  );
  return product.rows[0];
};

export const getAuthCookie = async (app: App, username: string) => {
  const userResponse = await request(app.getServer())
    .post("/api/v1/auth/register")
    .send({
      username,
      email: `${username}@example.com`,
      password: "password"
    });

  return userResponse.headers["set-cookie"][0];
};

export const createProductRequest = async (app: App, authCookie: string): Promise<Product> => {
  const productResponse = await request(app.getServer())
    .post("/api/v1/products")
    .set("Cookie", authCookie)
    .field("name", faker.commerce.productName())
    .field("description", faker.commerce.productDescription());

  return productResponse.body.data;
};

export const createAuctionRequest = async (app: App, authCookie: string): Promise<Auction> => {
  const auctionResponse = await request(app.getServer())
    .post("/api/v1/auctions")
    .set("Cookie", authCookie)
    .send({
      product_id: 1,
      start_time: addDays(new Date(), 1),
      duration_hours: 24,
      starting_price_in_cents: 1000
    } as CreateAuctionPayload);

  return auctionResponse.body.data;
};
