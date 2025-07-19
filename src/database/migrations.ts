import { Client } from "pg";
import { env } from "../config/env";
import { migrate } from "./setup";

async function main() {
  const client = new Client({
    host: env.POSTGRES_HOST,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
    port: env.POSTGRES_PORT
  });

  await client.connect();
  await migrate(client);
  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
