import { faker } from "@faker-js/faker/.";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import App from "app";
import { Auction, CreateAuctionPayload } from "auctions/auctions.validation";
import { migrate } from "database/setup";
import { addDays, subDays } from "date-fns";
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

export const createAuctionInThePast = async (client: Client, userId: number, productId: number) => {
  const auction = await client.query<Auction>(
    "INSERT INTO auctions (product_id, creator_id, start_time, duration_hours, starting_price_in_cents) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [productId, userId, subDays(new Date(), 10), 24, 1000]
  );
  return auction.rows[0];
};

export const createProductRequest = async (app: App, authCookie: string): Promise<Product> => {
  const productResponse = await request(app.getServer())
    .post("/api/v1/products")
    .set("Cookie", authCookie)
    .field("name", faker.commerce.productName())
    .field("description", faker.commerce.productDescription());

  return productResponse.body.data;
};

export const bulkInsertProducts = async (app: App, count: number) => {
  const authCookie = await getAuthCookieAfterRegister(app, "testuser");
  for (let i = 0; i < count; i++) {
    await createProductRequest(app, authCookie);
  }
};

export const createAuctionRequest = async (
  app: App,
  authCookie: string,
  productId: number
): Promise<Auction> => {
  const auctionResponse = await request(app.getServer())
    .post("/api/v1/auctions")
    .set("Cookie", authCookie)
    .send({
      product_id: productId,
      start_time: addDays(new Date(), 1),
      duration_hours: 24,
      starting_price_in_cents: 1000
    } as CreateAuctionPayload);

  return auctionResponse.body.data;
};
