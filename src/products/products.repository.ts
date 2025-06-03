import { CreateProductPayload, Product } from "./products.validation";
import { PaginatedRequestParams } from "api/api.validations";
import { DatabaseService } from "interfaces/database.interface";

export class ProductRepository {
  constructor(private readonly db: DatabaseService) {}

  public async getProducts(params: PaginatedRequestParams) {
    const result = await this.db.query<Product>(
      "SELECT id, name, description, price, image_url, created_at, updated_at FROM products WHERE id > $1 ORDER BY id ASC LIMIT $2",
      [params.cursor ?? 0, params.limit]
    );
    return result.rows;
  }

  public async createProduct(product: CreateProductPayload) {
    const result = await this.db.query<Product>(
      "INSERT INTO products (name, description, price, image_url) VALUES ($1, $2, $3, $4) RETURNING *",
      [product.name, product.description, product.price, product.image_url]
    );
    return result.rows[0];
  }
}
