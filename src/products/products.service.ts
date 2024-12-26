import { ProductRepository } from "./products.repository";

export class ProductService {
  private productRepository = new ProductRepository();

  public async getProducts() {
    return this.productRepository.getProducts();
  }
}
