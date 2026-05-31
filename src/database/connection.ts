import { ClientConfig } from "pg";
import { env } from "config/env";

export const dbConnectionConfig: ClientConfig = {
  host: env.POSTGRES_HOST,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  port: env.POSTGRES_PORT,
  ssl: env.POSTGRES_SSL ? { rejectUnauthorized: true } : false
};
