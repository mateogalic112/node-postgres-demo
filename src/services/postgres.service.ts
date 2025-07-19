import { env } from "config/env";
import { DatabaseService } from "interfaces/database.interface";
import { Pool, QueryConfig, QueryConfigValues, QueryResult, QueryResultRow } from "pg";

export class PostgresService implements DatabaseService {
  private static instance: PostgresService;
  private readonly pool: Pool;

  private constructor() {
    this.pool = new Pool({
      host: env.POSTGRES_HOST,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      database: env.POSTGRES_DB,
      port: env.POSTGRES_PORT,
      idleTimeoutMillis: 30000
    });
  }

  public static getInstance(): PostgresService {
    if (!PostgresService.instance) {
      PostgresService.instance = new PostgresService();
    }
    return PostgresService.instance;
  }

  public async query<R extends QueryResultRow, I = unknown[]>(
    queryTextOrConfig: string | QueryConfig<I>,
    values?: QueryConfigValues<I>
  ): Promise<QueryResult<R>> {
    return this.pool.query(queryTextOrConfig, values);
  }

  public async connect() {
    return this.pool.connect();
  }

  public async end() {
    return this.pool.end();
  }
}
