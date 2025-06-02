import { AuthController } from "auth/auth.controller";
import App from "./app";
import { ProductController } from "products/products.controller";
import { AuthService } from "auth/auth.service";
import { ProductService } from "products/products.service";
import { ProductRepository } from "products/products.repository";
import { Pool } from "pg";
import { env } from "config/env";
import { UsersRepository } from "users/users.repository";
import { AWSService } from "services/aws.service";

const pool = new Pool({
  host: env.POSTGRES_HOST,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  port: env.POSTGRES_PORT,
  idleTimeoutMillis: 30000
});

const app = new App([
  new AuthController(pool, new AuthService(new UsersRepository(pool))),
  new ProductController(
    pool,
    new ProductService(new ProductRepository(pool)),
    AWSService.getInstance()
  )
]);

app.listen();
