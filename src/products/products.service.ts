import { ProductRepository } from "./products.repository";
import { CreateProductPayload, Product, productSchema } from "./products.validation";
import { PaginatedRequestParams, paginatedResponseSchema } from "api/api.validations";

export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  public async getProducts(params: PaginatedRequestParams) {
    const products = await this.productRepository.getProducts(params);
    const parsedProducts = products.map((product) => productSchema.parse(product));

    return paginatedResponseSchema(productSchema).parse({
      data: parsedProducts,
      nextCursor:
        parsedProducts.length === params.limit
          ? { id: parsedProducts[parsedProducts.length - 1].id }
          : null
    });
  }

  public async createProduct(userId: number, payload: CreateProductPayload): Promise<Product> {
    return this.productRepository.createProduct(userId, payload);
  }
}
