import { Controller } from "api/api.controllers";
import { ProductService } from "./products.service";
import { createProductSchema } from "./products.validation";
import authMiddleware from "middleware/auth.middleware";
import asyncMiddleware from "middleware/async.middleware";
import { paginatedRequestSchema } from "api/api.validations";
import { Database } from "api/api.database";
import { UsersRepository } from "users/users.repository";

export class ProductController extends Controller {
  constructor(
    private readonly db: Database,
    private readonly productService: ProductService
  ) {
    super("/products");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}`, this.getProducts);
    this.router.post(
      `${this.path}`,
      authMiddleware(new UsersRepository(this.db)),
      this.createProduct
    );
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
