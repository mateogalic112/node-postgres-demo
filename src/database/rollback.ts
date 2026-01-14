import { Client } from "pg";
import { rollback } from "./setup";
import { env } from "config/env";

async function main() {
  const steps = parseInt(process.argv[2] || "1", 10);

  if (isNaN(steps) || steps < 1) {
    console.error("Usage: yarn migrate:down [steps]");
    console.error("  steps: Number of migrations to rollback (default: 1)");
    process.exit(1);
  }

  const client = new Client({
    host: env.POSTGRES_HOST,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
    port: env.POSTGRES_PORT
  });

  await client.connect();
  await rollback(client, steps);
  await client.end();
}

main().catch((err) => {
  console.error("Rollback failed:", err);
  process.exit(1);
});
