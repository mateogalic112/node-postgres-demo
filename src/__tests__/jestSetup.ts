import { PostgresService } from "services/postgres.service";

const TABLES_KEPT_BETWEEN_TESTS = ["_migrations", "roles"];

const db = PostgresService.getInstance();
let truncateAllSql: string;

beforeAll(async () => {
  const { rows } = await db.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> ALL($1)`,
    [TABLES_KEPT_BETWEEN_TESTS]
  );
  const tables = rows.map(({ tablename }) => `"${tablename}"`).join(", ");
  truncateAllSql = `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`;
});

beforeEach(async () => {
  await db.query(truncateAllSql);
});

afterAll(() => db.close());
