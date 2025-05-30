import { Controller } from "interfaces/controller.interface";
import { ProductService } from "./products.service";
import { createProductSchema } from "./products.validation";
import { ProductRepository } from "./products.repository";
import authMiddleware from "middleware/auth.middleware";
import asyncMiddleware from "middleware/async.middleware";
import { paginatedRequestSchema } from "validations/api.validation";

export class ProductController extends Controller {
  private productService = new ProductService(new ProductRepository());

  constructor() {
    super("/products");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}`, this.getProducts);
    this.router.post(`${this.path}`, authMiddleware, this.createProduct);
  }

  private getProducts = asyncMiddleware(async (request, response) => {
    const { limit, cursor } = paginatedRequestSchema.parse(request).query;
    const products = await this.productService.getProducts({
      limit,
      cursor
    });
    response.json(products);
  });

  private createProduct = asyncMiddleware(async (request, response) => {
    const payload = createProductSchema.parse(request).body;
    const product = await this.productService.createProduct(payload);
    response.status(201).json(product);
  });
}
