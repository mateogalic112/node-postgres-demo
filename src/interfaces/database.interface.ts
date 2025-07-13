import type { QueryResult, QueryConfig, QueryResultRow, QueryConfigValues, PoolClient } from "pg";

export interface DatabaseService {
  connect(): Promise<PoolClient>;

  query<R extends QueryResultRow, I = unknown[]>(
    queryTextOrConfig: string | QueryConfig<I>,
    values?: QueryConfigValues<I>
  ): Promise<QueryResult<R>>;
}
