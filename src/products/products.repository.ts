import pool from "config/database";
import { CreateProductPayload, Product } from "./products.validation";
import { PaginatedRequestParams } from "validations/api.validation";

export class ProductRepository {
  public async getProducts(params: PaginatedRequestParams) {
    const result = await pool.query<Product>(
      "SELECT id, name, description, price, created_at, updated_at FROM products WHERE id > $1 ORDER BY id ASC LIMIT $2",
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
