import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";
import { migrate } from "../database/setup";
import { workerDatabaseName } from "./workerDatabase";

export default async function globalSetup({ maxWorkers }: { maxWorkers: number }) {
  const container = await new PostgreSqlContainer("pgvector/pgvector:pg15").start();

  // Jest globals set here are only visible to globalTeardown; tests get the connection via env.
  (globalThis as Record<string, unknown>).__POSTGRES_CONTAINER__ = container;
  Object.assign(process.env, {
    POSTGRES_HOST: container.getHost(),
    POSTGRES_PORT: String(container.getPort()),
    POSTGRES_USER: container.getUsername(),
    POSTGRES_PASSWORD: container.getPassword()
  });

  const templateDatabase = container.getDatabase();
  const templateClient = new Client({ connectionString: container.getConnectionUri() });
  await templateClient.connect();
  await migrate(templateClient);
  await templateClient.end();

  // Copying a template requires no open connections to it, so copies run sequentially from another DB.
  const adminClient = new Client({
    host: container.getHost(),
    port: container.getPort(),
    user: container.getUsername(),
    password: container.getPassword(),
    database: "postgres"
  });
  await adminClient.connect();
  for (let workerId = 1; workerId <= maxWorkers; workerId++) {
    await adminClient.query(
      `CREATE DATABASE "${workerDatabaseName(workerId)}" TEMPLATE "${templateDatabase}"`
    );
  }
  await adminClient.end();
}
