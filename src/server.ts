import { AuthController } from "auth/auth.controller";
import App from "./app";
import { ProductController } from "products/products.controller";
import pool from "database/pool";
import { AuthService } from "auth/auth.service";
import { AuthRepository } from "auth/auth.repository";
import { ProductService } from "products/products.service";
import { ProductRepository } from "products/products.repository";

const app = new App([
  new AuthController(pool, new AuthService(new AuthRepository(pool))),
  new ProductController(pool, new ProductService(new ProductRepository(pool)))
]);

app.listen();
