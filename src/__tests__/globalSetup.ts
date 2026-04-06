import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";
import { migrate } from "../database/setup";
import bcrypt from "bcrypt";
import { RoleName } from "../roles/roles.validation";
import { TEST_ADMIN_USER } from "./constants";

export default async function globalSetup() {
  const postgresContainer = await new PostgreSqlContainer("pgvector/pgvector:pg15").start();

  // Store connection string in global for other test files
  (globalThis as unknown as Record<string, unknown>).__POSTGRES_CONTAINER__ = postgresContainer;

  const client = new Client({ connectionString: postgresContainer.getConnectionUri() });
  await client.connect();

  await migrate(client);

  await insertAdmin(client);

  await client.end();

  console.log("Global test setup complete - PostgreSQL container started");
}

async function insertAdmin(client: Client) {
  const adminRole = await client.query(`SELECT id FROM roles WHERE name = $1`, [RoleName.ADMIN]);
  const roleId = adminRole.rows[0].id;

  const { username, email, password } = TEST_ADMIN_USER;
  const hashedPassword = await bcrypt.hash(password, 10);

  await client.query(
    `INSERT INTO users (username, email, password, role_id) VALUES ($1, $2, $3, $4)`,
    [username, email, hashedPassword, roleId]
  );
}
