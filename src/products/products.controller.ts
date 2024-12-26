import { Controller } from "interfaces/controller.interface";
import { ProductService } from "./products.service";
import { Request, Response } from "express";
import validationMiddleware from "middleware/validation.middleware";
import { PaginatedProductsRequestSchema } from "./products.validation";

export class ProductController extends Controller {
  private productService = new ProductService();

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
  }

  private getProducts = async (request: Request, response: Response) => {
    const params = request.query;

    const limit = parseInt(params.limit as string, 10);
    const cursor = params.cursor ? parseInt(params.cursor as string, 10) : null;

    const products = await this.productService.getProducts({ limit, cursor });
    response.json(products);
  };
}
