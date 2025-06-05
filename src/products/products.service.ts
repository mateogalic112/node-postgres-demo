import { ProductRepository } from "./products.repository";
import { CreateProductPayload, Product, productSchema } from "./products.validation";
import { PaginatedRequestParams } from "api/api.validations";

export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  public async getProducts(params: PaginatedRequestParams) {
    const products = await this.productRepository.getProducts(params);
    return products.map((product) => productSchema.parse(product));
  }

  public async createProduct(userId: number, payload: CreateProductPayload): Promise<Product> {
    return this.productRepository.createProduct(userId, payload);
  }

  public async getProductById(id: number) {
    const product = await this.productRepository.getProductById(id);
    if (!product) return null;

    return productSchema.parse(product);
  }
}
