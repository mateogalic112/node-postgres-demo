import pool from "config/database";
import { Product } from "./products.model";
import { PaginatedRequestParams } from "interfaces/api.interface";
import { QueryResult } from "pg";

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
}
