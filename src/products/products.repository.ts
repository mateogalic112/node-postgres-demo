import { InternalServerError } from "api/api.errors";
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

  public async findProductById(id: number) {
    const result = await this.DB.query<Product>("SELECT * FROM products WHERE id = $1", [id]);
    if (!result.rowCount) {
      return null;
    }
    return result.rows[0];
  }

  public async createProduct({
    userId,
    payload
  }: {
    userId: number;
    payload: CreateProductPayload["body"] & { imageUrl: string | null };
  }) {
    const result = await this.DB.query<Product>(
      "INSERT INTO products (name, description, price, image_url, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [payload.name, payload.description, payload.price, payload.imageUrl, userId]
    );
    if (result.rows.length === 0) throw new InternalServerError("Failed to create product");

    return result.rows[0];
  }
}
