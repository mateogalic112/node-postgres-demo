import { CreateProductPayload, Product } from "./products.validation";
import { PaginatedRequestParams } from "api/api.validations";
import { DatabaseService } from "interfaces/database.interface";

export class ProductRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async getProducts(params: PaginatedRequestParams) {
    const result = await this.DB.query<Product>(
      "SELECT * FROM products WHERE id > $1 ORDER BY id ASC LIMIT $2",
      [params.cursor ?? 0, params.limit]
    );
    return result.rows;
  }

  public async createProduct(userId: number, product: CreateProductPayload) {
    const result = await this.DB.query<Product>(
      "INSERT INTO products (name, description, price, image_url, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [product.name, product.description, product.price, product.image_url, userId]
    );
    return result.rows[0];
  }
}
