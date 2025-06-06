import { Controller } from "api/api.controllers";
import { ProductService } from "./products.service";
import { createProductSchema } from "./products.validation";
import authMiddleware from "middleware/auth.middleware";
import asyncMiddleware from "middleware/async.middleware";
import { idSchema, paginatedRequestSchema } from "api/api.validations";
import { fileMiddleware } from "middleware/file.middleware";
import { userSchema } from "users/users.validation";
import { UserService } from "users/users.service";
import { formatPaginatedResponse, formatResponse } from "api/api.formats";

export class ProductController extends Controller {
  constructor(
    private readonly usersService: UserService,
    private readonly productService: ProductService
  ) {
    super("/products");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}`, this.getProducts);
    this.router.get(`${this.path}/:id`, this.getProductById);
    this.router.post(
      `${this.path}`,
      authMiddleware(this.usersService),
      fileMiddleware({ limitMB: 5, allowedFormats: ".jpg|.jpeg|.png|.gif|.webp" }).single("image"),
      this.createProduct
    );
  }

  private getProducts = asyncMiddleware(async (request, response) => {
    const { limit, cursor } = paginatedRequestSchema.parse(request.query);
    const products = await this.productService.getProducts({ limit, cursor });

    response.json(formatPaginatedResponse(products, limit));
  });

  private getProductById = asyncMiddleware(async (request, response) => {
    const product = await this.productService.getProductById(idSchema.parse(request.params).id);
    response.json(formatResponse(product));
  });

  private createProduct = asyncMiddleware(async (request, response) => {
    const product = await this.productService.createProduct({
      user: userSchema.parse(response.locals.user),
      payload: createProductSchema.parse(request)
    });
    response.status(201).json(formatResponse(product));
  });
}
