import pool from "config/database";
import { Product } from "./products.model";
import { PaginatedRequestParams } from "interfaces/api.interface";
import { CreateProductPayload } from "./products.validation";

export class ProductRepository {
  public async getProducts(params: PaginatedRequestParams) {
    const result = await pool.query<Product>(
      "SELECT id, name, description, price FROM products WHERE id > $1 ORDER BY id ASC LIMIT $2",
      [params.cursor ?? 0, params.limit]
    );
    return result.rows;
  }

  public async createProduct(product: CreateProductPayload) {
    const result = await pool.query<Product>(
      "INSERT INTO products (name, description, price) VALUES ($1, $2, $3)",
      [product.name, product.description, product.price]
    );
    return result.rows[0];
  }
}
