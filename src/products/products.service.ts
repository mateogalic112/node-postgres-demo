import { ProductRepository } from "./products.repository";
import { CreateProductPayload, Product, productSchema } from "./products.validation";
import { PaginatedRequestParams } from "api/api.validations";
import { User } from "users/users.validation";
import { FilesService } from "interfaces/files.interface";
import { NotFoundError } from "api/api.errors";
import { EmbeddingService } from "interfaces/embeddings.interface";
import { LoggerService } from "services/logger.service";

export class ProductService {
  private readonly MAX_RELEVANT_PRODUCTS = 3;

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly filesService: FilesService,
    private readonly embeddingService: EmbeddingService
  ) {}

  public async getProducts(params: PaginatedRequestParams) {
    const result = await this.productRepository.getProducts(params);
    return this.toProducts(result);
  }

  public async getProductById(id: number) {
    const result = await this.productRepository.findProductById(id);
    if (!result) {
      throw new NotFoundError(`Product with id ${id} not found`);
    }
    return this.toProduct(result);
  }

  public async getProductsByIds(ids: number[]) {
    const result = await this.productRepository.findProductsByIds(ids);
    return this.toProducts(result);
  }

  public async findRelevantProducts(query: string) {
    const embeddedQuery = await this.embeddingService.generateEmbedding(query);
    if (!embeddedQuery || !embeddedQuery.embedding) {
      return [];
    }
    const relevantProducts = await this.productRepository.findRelevantProducts(
      embeddedQuery.embedding,
      this.MAX_RELEVANT_PRODUCTS
    );
    const result = await this.productRepository.findProductsByIds(
      relevantProducts.map((product) => product.product_id)
    );
    return this.toProducts(result);
  }

  public async createProduct(user: User, payload: CreateProductPayload) {
    const result = await this.productRepository.createProduct(user, {
      ...payload.body,
      imageUrl: await this.getProductImageUrl(payload.file)
    });
    return this.toProduct(result);
  }

  public async createProductEmbedding(product: Product) {
    try {
      const embedding = await this.embeddingService.generateEmbeddings(product.description);
      await this.productRepository.attachEmbedding(product.id, embedding);
    } catch (error) {
      LoggerService.getInstance().error(String(error));
    }
  }

  private toProduct(data: unknown): Product {
    return productSchema.parse(data);
  }

  private toProducts(data: Array<unknown>): Array<Product> {
    return data.map(this.toProduct);
  }

  private getProductImageUrl(rawFile: CreateProductPayload["file"]) {
    if (!rawFile) return null;
    return this.filesService.uploadFile(rawFile, `products/${crypto.randomUUID()}`);
  }
}
