import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";
import { migrate } from "../database/setup";
import bcrypt from "bcrypt";
import { Role, RoleName } from "../roles/roles.validation";
import { User } from "../users/users.validation";
import { TEST_ADMIN_USER } from "./constants";

let postgresContainer: StartedPostgreSqlContainer;

const DEFAULT_ROLES = new Map<RoleName, string>([
  [RoleName.ADMIN, "Admin role"],
  [RoleName.USER, "User role"]
]);

export default async function globalSetup() {
  // Start the postgres container once for all tests
  postgresContainer = await new PostgreSqlContainer("pgvector/pgvector:pg15").start();

  // Store connection string in global for other test files
  (globalThis as unknown as Record<string, unknown>).__POSTGRES_CONTAINER__ = postgresContainer;

  // Run migrations once
  const client = new Client({ connectionString: postgresContainer.getConnectionUri() });
  await client.connect();
  await migrate(client);

  // Insert default roles
  for (const [name, description] of DEFAULT_ROLES) {
    await client.query(`INSERT INTO roles (name, description) VALUES ($1, $2)`, [
      name,
      description
    ]);
  }

  // Get the admin role
  const adminRole = await client.query<Role>(`SELECT * FROM roles WHERE name = $1`, [
    RoleName.ADMIN
  ]);
  const roleId = adminRole.rows[0].id;
  // Insert default admin user with hashed password
  const { username, email, password } = TEST_ADMIN_USER;
  const hashedPassword = await bcrypt.hash(password, 10);
  await client.query<User>(
    `INSERT INTO users (username, email, password, role_id) VALUES ($1, $2, $3, $4)`,
    [username, email, hashedPassword, roleId]
  );

  await client.end();

  console.log("Global test setup complete - PostgreSQL container started");
}
