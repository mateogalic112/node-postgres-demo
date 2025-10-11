import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";
import { migrate } from "../database/setup";
import bcrypt from "bcrypt";

let postgresContainer: StartedPostgreSqlContainer;
let connectionString: string;

export default async function globalSetup() {
  // Set test environment variables
  setTestEnvironmentVariables();

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

function setTestEnvironmentVariables() {
  // Set test environment variables
  process.env.NODE_ENV = "test";
  process.env.POSTGRES_USER = "test";
  process.env.POSTGRES_PASSWORD = "test";
  process.env.POSTGRES_HOST = "localhost";
  process.env.POSTGRES_PORT = "5432";
  process.env.POSTGRES_DB = "test";
  process.env.JWT_SECRET = "test-jwt-secret-for-testing-only";
  process.env.FRONTEND_URL = "http://localhost:3000";
  process.env.AWS_ACCESS_KEY_ID = "test-aws-access-key";
  process.env.AWS_SECRET_ACCESS_KEY = "test-aws-secret-key";
  process.env.AWS_REGION = "us-east-1";
  process.env.AWS_S3_BUCKET = "test-bucket";
  process.env.ADMIN_EMAIL = "admin@test.com";
  process.env.RESEND_API_KEY = "test-resend-api-key";
  process.env.OPENAI_API_KEY = "test-openai-api-key";
  process.env.STRIPE_SECRET_KEY = "test-stripe-secret-key";
}
