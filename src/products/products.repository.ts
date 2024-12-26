import pool from "config/database";
import { Product } from "./products.model";
import { PaginatedRequestParams } from "interfaces/api.interface";
import { QueryResult } from "pg";
import { CreateProductPayload } from "./products.validation";

export class ProductRepository {
  public async getProducts(params: PaginatedRequestParams) {
    let queryPromise: Promise<QueryResult<Product>>;

    if (!params.cursor) {
      queryPromise = pool.query<Product>(
        "SELECT id, name, description, price FROM products ORDER BY id ASC LIMIT $1",
        [params.limit]
      );
    } else {
      queryPromise = pool.query<Product>(
        "SELECT id, name, description, price FROM products WHERE id > $1 ORDER BY id ASC LIMIT $2",
        [params.cursor, params.limit]
      );
    }

    const result = await queryPromise;
    return result.rows;
  }

  public async createProduct(product: CreateProductPayload) {
    const result = await pool.query<Product>(
      "INSERT INTO products (name, description, price) VALUES ($1, $2, $3) RETURNING *",
      [product.name, product.description, product.price]
    );
    return result.rows[0];
  }
}
