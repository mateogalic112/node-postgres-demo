export const workerDatabaseName = (workerId: number | string) => `test_worker_${workerId}`;

// Runs before any test module loads, so config/env picks up this worker's database.
if (process.env.JEST_WORKER_ID) {
  process.env.POSTGRES_DB = workerDatabaseName(process.env.JEST_WORKER_ID);
}
