import { Controller } from "interfaces/controller.interface";
import { ProductService } from "./products.service";
import { type Request, type Response } from "express";
import validationMiddleware from "middleware/validation.middleware";
import { createProductSchema } from "./products.validation";
import { ProductRepository } from "./products.repository";
import authMiddleware from "middleware/auth.middleware";
import { PaginatedRequestSchema } from "validations/api.validation";

export class ProductController extends Controller {
  private productService = new ProductService(new ProductRepository());

  constructor() {
    super("/products");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}`, this.getProducts);
    this.router.post(
      `${this.path}`,
      authMiddleware,
      validationMiddleware(createProductSchema),
      this.createProduct
    );
  }

  private getProducts = async (request: Request, response: Response) => {
    const { limit, cursor } = PaginatedRequestSchema.parse(request).query;

    const products = await this.productService.getProducts({ limit, cursor });
    response.json(products);
  };

  private createProduct = async (request: Request, response: Response) => {
    const product = await this.productService.createProduct(request.body);
    response.status(201).json(product);
  };
}
