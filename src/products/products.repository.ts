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

  public async findProductByIds(ids: number[]) {
    const result = await this.DB.query<Product>("SELECT * FROM products WHERE id = ANY($1)", [ids]);
    return result.rows;
  }

  public async findProductsByIds(ids: number[]) {
    const result = await this.DB.query<Product>("SELECT * FROM products WHERE id = ANY($1)", [ids]);
    return result.rows;
  }

  public async createProduct(
    user: User,
    payload: CreateProductPayload["body"] & { imageUrl: string | null }
  ) {
    const result = await this.DB.query<Product>(
      "INSERT INTO products (name, description, image_url, owner_id, price_in_cents) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [payload.name, payload.description, payload.imageUrl, user.id, payload.price_in_cents]
    );
    return result.rows[0];
  }

  public async findRelevantProducts(embeddedQuery: Embedding, limit: number) {
    const result = await this.DB.query<Pick<ProductEmbedding, "id" | "product_id">>(
      `SELECT
        e.id, e.product_id, 1 - (e.embedding <=> $1::vector) AS cosine_similarity FROM products_embeddings e
        WHERE 1 - (e.embedding <=> $1::vector) > 0.5
        ORDER BY cosine_similarity DESC
        LIMIT $2`,
      [`[${embeddedQuery.join(",")}]`, limit]
    );
    return result.rows;
  }

  public async createEmbedding(productId: number, embeddings: Embedding[]) {
    await this.DB.query<ProductEmbedding>(
      `INSERT INTO products_embeddings (product_id, embedding) VALUES ${embeddings.map((_, index) => `($1, $${index + 2}::vector)`).join(", ")}`,
      [productId, ...embeddings.map((embedding) => `[${embedding.join(",")}]`)]
    );

    LoggerService.getInstance().log(
      `Created ${embeddings.length} embeddings for product ${productId}`
    );
  }
}
