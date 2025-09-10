import { Embedding } from "ai";
import { CreateProductPayload, Product, ProductEmbedding } from "./products.validation";
import { PaginatedRequestParams } from "api/api.validations";
import { DatabaseService } from "interfaces/database.interface";
import { User } from "users/users.validation";
import { LoggerService } from "services/logger.service";

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

  public async createEmbedding(productId: number, embeddings: Embedding[]) {
    // Create placeholders for batch insert - each embedding needs its own parameter
    const values = embeddings.map((_, index) => `($1, $${index + 2}::vector)`).join(", ");

    // Format each embedding as a vector string for PostgreSQL
    const vectorStrings = embeddings.map((embedding) => `[${embedding.join(",")}]`);

    await this.DB.query<ProductEmbedding>(
      `INSERT INTO products_embeddings (product_id, embedding) VALUES ${values}`,
      [productId, ...vectorStrings]
    );

    LoggerService.getInstance().log(
      `Created ${embeddings.length} embeddings for product ${productId}`
    );
  }
}
