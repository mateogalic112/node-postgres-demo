import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

export default async function globalTeardown() {
  const postgresContainer = (globalThis as Record<string, unknown>)
    .__POSTGRES_CONTAINER__ as StartedPostgreSqlContainer;

  if (postgresContainer) {
    try {
      await postgresContainer.stop({ timeout: 1000 });
      console.log("Global test teardown complete - PostgreSQL container stopped");
    } catch (error) {
      console.warn("Error stopping PostgreSQL container:", error);
    }
  }
}
