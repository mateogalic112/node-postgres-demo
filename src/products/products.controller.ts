import { Controller } from "interfaces/controller.interface";
import { ProductService } from "./products.service";
import { Request, Response } from "express";
import validationMiddleware from "middleware/validation.middleware";
import { createProductSchema, PaginatedProductsRequestSchema } from "./products.validation";
import { ProductRepository } from "./products.repository";
import authMiddleware from "middleware/auth.middleware";

export class ProductController extends Controller {
  private productService = new ProductService(new ProductRepository());

  constructor() {
    super("/products");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(
      `${this.path}`,
      validationMiddleware(PaginatedProductsRequestSchema),
      this.getProducts
    );
    this.router.post(
      `${this.path}`,
      authMiddleware,
      validationMiddleware(createProductSchema),
      this.createProduct
    );
  }

  private getProducts = async (request: Request, response: Response) => {
    const params = request.query;

    const limit = parseInt(params.limit as string, 10);
    const cursor = params.cursor ? parseInt(params.cursor as string, 10) : null;

    const products = await this.productService.getProducts({ limit, cursor });
    response.json(products);
  };

  private createProduct = async (request: Request, response: Response) => {
    const product = await this.productService.createProduct(request.body);
    response.status(201).json(product);
  };
}
