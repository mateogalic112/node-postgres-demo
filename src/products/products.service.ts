import { PaginatedRequestParams, PaginatedResponse } from "interfaces/api.interface";
import { ProductRepository } from "./products.repository";
import { Product } from "./products.model";

export class ProductService {
  private productRepository = new ProductRepository();

  public async getProducts(params: PaginatedRequestParams): Promise<PaginatedResponse<Product>> {
    const products = await this.productRepository.getProducts(params);

    return {
      data: products,
      nextCursor: products.length === params.limit ? { id: products[products.length - 1].id } : null
    };
  }
}
