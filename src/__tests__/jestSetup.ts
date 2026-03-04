import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";
import { TEST_ADMIN_USER } from "./mocks";

let client: Client;

beforeAll(async () => {
  const container = (globalThis as unknown as Record<string, unknown>)
    .__POSTGRES_CONTAINER__ as StartedPostgreSqlContainer;

  if (!container) {
    throw new Error(
      "PostgreSQL container not found. Make sure globalSetup is configured correctly."
    );
  }

  client = new Client({ connectionString: container.getConnectionUri() });
  await client.connect();

  // Store shared state globally
  (globalThis as Record<string, unknown>).__TEST_CLIENT__ = client;
});

beforeEach(async () => {
  // Reset database to clean state before each test using a transaction for atomicity
  try {
    await client.query("BEGIN");
    await client.query(`
      TRUNCATE TABLE
        bids,
        auctions,
        products,
        orders,
        order_details,
        user_customers
      RESTART IDENTITY CASCADE
    `);
    await client.query(`DELETE FROM users WHERE email != $1`, [TEST_ADMIN_USER.email]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw new Error(`Database reset failed - aborting test: ${error}`);
  }
});

afterAll(async () => {
  try {
    await client.end();
  } catch (error) {
    console.warn("Error ending client:", error);
  } finally {
    delete (globalThis as Record<string, unknown>).__TEST_CLIENT__;
  }
});
