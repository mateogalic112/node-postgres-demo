import { Client } from "pg";
import { migrate } from "./setup";
import { dbConnectionConfig } from "./connection";

async function main() {
  const client = new Client(dbConnectionConfig);

  await client.connect();
  await migrate(client);
  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
