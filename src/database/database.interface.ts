import type { QueryResult, QueryConfig, QueryResultRow, QueryConfigValues } from "pg";

export interface Database {
  query<R extends QueryResultRow, I = unknown[]>(
    queryTextOrConfig: string | QueryConfig<I>,
    values?: QueryConfigValues<I>
  ): Promise<QueryResult<R>>;
}
