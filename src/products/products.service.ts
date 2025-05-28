import { PaginatedResponse } from "interfaces/api.interface";
import { ProductRepository } from "./products.repository";
import { CreateProductPayload, Product, productSchema } from "./products.validation";
import { PaginatedRequestParams } from "validations/api.validation";

export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  public async getProducts(params: PaginatedRequestParams): Promise<PaginatedResponse<Product>> {
    const products = await this.productRepository.getProducts(params);
    const parsedProducts = products.map((product) => productSchema.parse(product));

    return {
      data: parsedProducts,
      nextCursor: products.length === params.limit ? { id: products[products.length - 1].id } : null
    };
  }

  public async createProduct(payload: CreateProductPayload): Promise<Product> {
    return this.productRepository.createProduct(payload);
  }
}
