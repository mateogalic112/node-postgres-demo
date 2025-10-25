import { ProductRepository } from "./products.repository";
import { CreateProductPayload, productSchema } from "./products.validation";
import { PaginatedRequestParams } from "api/api.validations";
import { User } from "users/users.validation";
import { FilesService } from "interfaces/files.interface";
import { NotFoundError } from "api/api.errors";
import { EmbeddingService } from "interfaces/embeddings.interface";

export class ProductService {
  private readonly MAX_RELEVANT_PRODUCTS = 3;

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly filesService: FilesService,
    private readonly embeddingService: EmbeddingService
  ) {}

  public async getProducts(params: PaginatedRequestParams) {
    const products = await this.productRepository.getProducts(params);
    return products.map((product) => productSchema.parse(product));
  }

  public async getProductById(id: number) {
    const product = await this.productRepository.findProductById(id);
    if (!product) {
      throw new NotFoundError(`Product with id ${id} not found`);
    }
    return productSchema.parse(product);
  }

  public async getProductsByIds(ids: number[]) {
    const products = await this.productRepository.findProductsByIds(ids);
    return products.map((product) => productSchema.parse(product));
  }

  public async findRelevantProducts(query: string) {
    const embeddedQuery = await this.embeddingService.generateEmbedding(query);
    if (!embeddedQuery || !embeddedQuery.embedding) {
      return [];
    }
    const relevantProductIds = await this.productRepository.findRelevantProducts(
      embeddedQuery.embedding,
      this.MAX_RELEVANT_PRODUCTS
    );
    const products = await this.productRepository.findProductByIds(
      relevantProductIds.map((product) => product.product_id)
    );
    return products.map((product) => productSchema.parse(product));
  }

  public async createProduct({ user, payload }: { user: User; payload: CreateProductPayload }) {
    const newProduct = await this.productRepository.createProduct(user, {
      ...payload.body,
      imageUrl: payload.file
        ? await this.filesService.uploadFile(payload.file, `products/${crypto.randomUUID()}`)
        : null
    });

    await this.productRepository.createEmbedding(
      newProduct.id,
      await this.embeddingService.generateEmbeddings(newProduct.description)
    );

    return productSchema.parse(newProduct);
  }
}
