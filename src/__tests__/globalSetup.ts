import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";
import { migrate } from "../database/setup";
import bcrypt from "bcrypt";
import { RoleName } from "../roles/roles.validation";
import { TEST_ADMIN_USER } from "./constants";

export default async function globalSetup() {
  // Start the postgres container once for all tests
  const postgresContainer = await new PostgreSqlContainer("pgvector/pgvector:pg15").start();

  // Store connection string in global for other test files
  (globalThis as unknown as Record<string, unknown>).__POSTGRES_CONTAINER__ = postgresContainer;

  // Run migrations once
  const client = new Client({ connectionString: postgresContainer.getConnectionUri() });
  await client.connect();
  await migrate(client);

  // Get the admin role
  const adminRole = await client.query(`SELECT id FROM roles WHERE name = $1`, [RoleName.ADMIN]);
  const adminRoleId = adminRole.rows[0].id;

  // Get the admin user credentials
  const { username, email, password } = TEST_ADMIN_USER;
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insert default admin user with hashed password
  await client.query(
    `INSERT INTO users (username, email, password, role_id) VALUES ($1, $2, $3, $4)`,
    [username, email, hashedPassword, adminRoleId]
  );

  await client.end();

  console.log("Global test setup complete - PostgreSQL container started");
}
