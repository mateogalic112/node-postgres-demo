import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";
import { migrate } from "../database/setup";
import bcrypt from "bcrypt";

let postgresContainer: StartedPostgreSqlContainer;
let connectionString: string;

export default async function globalSetup() {
  // Start the postgres container once for all tests
  postgresContainer = await new PostgreSqlContainer("postgres:15").start();
  connectionString = postgresContainer.getConnectionUri();

  // Store connection string in global for other test files
  (globalThis as Record<string, unknown>).__POSTGRES_URI__ = connectionString;
  (globalThis as Record<string, unknown>).__POSTGRES_CONTAINER__ = postgresContainer;

  // Run migrations once
  const client = new Client({ connectionString });
  await client.connect();
  await migrate(client);

  // Create initial state once (roles and admin user)

  // Insert default roles
  await client.query(
    `INSERT INTO roles (name, description) VALUES ('admin', 'Admin role'), ('user', 'User role')`
  );

  // Insert default admin user with hashed password
  await client.query(
    `INSERT INTO users (username, email, password) VALUES ('admin', 'admin@example.com', $1)`,
    [await bcrypt.hash("password", 10)]
  );

  // Get the admin user and role IDs
  const adminRole = await client.query(`SELECT id FROM roles WHERE name = 'admin'`);
  const adminUser = await client.query(`SELECT id FROM users WHERE email = 'admin@example.com'`);

  // Insert default admin user role
  await client.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
    adminUser.rows[0].id,
    adminRole.rows[0].id
  ]);

  await client.end();

  console.log("Global test setup complete - PostgreSQL container started");
}
