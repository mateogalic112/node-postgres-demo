import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { migrate } from "database/setup";
import { Client } from "pg";

export const prepareDatabase = async () => {
  // @dev Start the postgres container
  const postgresContainer = await new PostgreSqlContainer("postgres:15").start();

  // @dev Connect to the database
  const client = new Client({ connectionString: postgresContainer.getConnectionUri() });
  await client.connect();

  // @dev Run migrations
  await migrate(client);

  return { client, postgresContainer };
};

export const cleanUpDatabase = async (
  client: Client,
  postgresContainer: StartedPostgreSqlContainer
) => {
  try {
    await client.end();
  } catch (error) {
    console.warn("Error ending client:", error);
  }

  try {
    await postgresContainer.stop({ timeout: 1000 });
  } catch (error) {
    console.warn("Error stopping container:", error);
  }
};
