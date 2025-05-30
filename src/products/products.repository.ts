import { CreateProductPayload, Product } from "./products.validation";
import { PaginatedRequestParams } from "api/api.validations";
import { Database } from "api/api.database";

export class ProductRepository {
  constructor(private readonly db: Database) {}

  public async getProducts(params: PaginatedRequestParams) {
    const result = await this.db.query<Product>(
      "SELECT id, name, description, price, image_url, created_at, updated_at FROM products WHERE id > $1 ORDER BY id ASC LIMIT $2",
      [params.cursor ?? 0, params.limit]
    );
    return result.rows;
  }

  public async createProduct(product: CreateProductPayload) {
    const result = await this.db.query<Product>(
      "INSERT INTO products (name, description, price) VALUES ($1, $2, $3)",
      [product.name, product.description, product.price]
    );
    return result.rows[0];
  }
}
