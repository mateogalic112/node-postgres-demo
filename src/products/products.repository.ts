import { CreateProductPayload, Product } from "./products.validation";
import { PaginatedRequestParams } from "api/api.validations";
import { DatabaseService } from "interfaces/database.interface";
import { User } from "users/users.validation";

export class ProductRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async getProducts(params: PaginatedRequestParams) {
    const result = await this.DB.query<Product>(
      "SELECT * FROM products WHERE id > $1 ORDER BY id ASC LIMIT $2",
      [params.cursor ?? 0, params.limit]
    );
    return result.rows;
  }

  public async findProductById(id: number) {
    const result = await this.DB.query<Product>("SELECT * FROM products WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0];
  }

  public async createProduct(
    user: User,
    payload: CreateProductPayload["body"] & { imageUrl: string | null }
  ) {
    const result = await this.DB.query<Product>(
      "INSERT INTO products (name, description, image_url, owner_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [payload.name, payload.description, payload.imageUrl, user.id]
    );
    return result.rows[0];
  }
}
