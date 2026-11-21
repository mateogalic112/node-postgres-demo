import { ProductsRepository } from "./products.repository";
import { CreateProductPayload, Product, productSchema } from "./products.validation";
import { PaginatedRequestParams } from "api/api.validations";
import { DatabaseUser } from "users/users.validation";
import { FilesService } from "interfaces/files.interface";
import { NotFoundError } from "api/api.errors";
import { EmbeddingsService } from "interfaces/embeddings.interface";
import { LoggerService } from "interfaces/logger.interface";

export class ProductsService {
  private readonly MAX_RELEVANT_PRODUCTS = 3;

  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly filesService: FilesService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly logger: LoggerService
  ) {}

  public async getProducts(params: PaginatedRequestParams) {
    const result = await this.productsRepository.getProducts(params);
    return this.toProducts(result);
  }

  public async getProductById(id: number) {
    const result = await this.productsRepository.findProductById(id);
    if (!result) {
      throw new NotFoundError(`Product with id ${id} not found`);
    }
    return this.toProduct(result);
  }

  public async getProductsByIds(ids: number[]) {
    const result = await this.productsRepository.findProductsByIds(ids);
    return this.toProducts(result);
  }

  public async findRelevantProducts(query: string) {
    const embeddedQuery = await this.embeddingsService.generateEmbedding(query);
    if (!embeddedQuery || !embeddedQuery.embedding) {
      return [];
    }
    const relevantProducts = await this.productsRepository.findRelevantProducts(
      embeddedQuery.embedding,
      this.MAX_RELEVANT_PRODUCTS
    );
    const result = await this.productsRepository.findProductsByIds(
      relevantProducts.map((product) => product.product_id)
    );
    return this.toProducts(result);
  }

  public async createProduct(user: DatabaseUser, payload: CreateProductPayload) {
    const result = await this.productsRepository.createProduct(user, {
      ...payload.body,
      imageUrl: await this.getProductImageUrl(payload.file)
    });
    return this.toProduct(result);
  }

  public async createProductEmbedding(product: Product) {
    try {
      const embedding = await this.embeddingsService.generateEmbeddings(product.description);
      await this.productsRepository.attachEmbedding(product.id, embedding);
    } catch (error) {
      this.logger.error(String(error));
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
