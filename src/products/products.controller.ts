import { Controller } from "interfaces/controller.interface";
import { ProductService } from "./products.service";
import { Request, Response } from "express";

export class ProductController extends Controller {
  private productService = new ProductService();

  constructor() {
    super("/products");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}`, this.getProducts);
  }

  private getProducts = async (_request: Request, response: Response) => {
    const products = await this.productService.getProducts();
    response.json({ data: products });
  };
}
