import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";
import { migrate } from "../database/setup";
import bcrypt from "bcrypt";

let postgresContainer: StartedPostgreSqlContainer;
let connectionString: string;

export default async function globalSetup() {
  // Start the postgres container once for all tests
  postgresContainer = await new PostgreSqlContainer("pgvector/pgvector:pg15").start();
  connectionString = postgresContainer.getConnectionUri();

  // Store connection string in global for other test files
  (globalThis as Record<string, unknown>).__POSTGRES_URI__ = connectionString;
  (globalThis as Record<string, unknown>).__POSTGRES_CONTAINER__ = postgresContainer;

  // Run migrations once
  const client = new Client({ connectionString });
  await client.connect();
  await migrate(client);

  // Insert default roles
  await client.query(
    `INSERT INTO roles (name, description) VALUES ('ADMIN', 'Admin role'), ('USER', 'User role')`
  );

  // Get the admin user and role IDs
  const adminRole = await client.query(`SELECT id FROM roles WHERE name = 'ADMIN'`);

  // Insert default admin user with hashed password
  await client.query(
    `INSERT INTO users (username, email, password, role_id) VALUES ('admin', 'admin@example.com', $1, $2)`,
    [await bcrypt.hash("password", 10), adminRole.rows[0].id]
  );

  await client.end();

  console.log("Global test setup complete - PostgreSQL container started");
}
