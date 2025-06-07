import { HttpController } from "api/api.controllers";
import { ProductService } from "./products.service";
import { createProductSchema, productImageSchema } from "./products.validation";
import authMiddleware from "middleware/auth.middleware";
import asyncMiddleware from "middleware/async.middleware";
import { idSchema, paginatedRequestSchema } from "api/api.validations";
import { fileMiddleware } from "middleware/file.middleware";
import { userSchema } from "users/users.validation";
import { formatPaginatedResponse, formatResponse } from "api/api.formats";
import { AuthService } from "auth/auth.service";

export class ProductController extends HttpController {
  constructor(
    private readonly productService: ProductService,
    private readonly authService: AuthService
  ) {
    super("/products");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}`, this.getProducts);
    this.router.get(`${this.path}/:id`, this.getProductById);
    this.router.post(
      `${this.path}`,
      authMiddleware(this.authService),
      fileMiddleware({
        limitMB: productImageSchema.maxSizeMB,
        allowedFormats: productImageSchema.allowedFormats
      }).single("image"),
      this.createProduct
    );
  }

  private getProducts = asyncMiddleware(async (request, response) => {
    const { limit, cursor } = paginatedRequestSchema.parse(request.query);
    const products = await this.productService.getProducts({ limit, cursor });
    response.json(formatPaginatedResponse(products, limit));
  });

  private getProductById = asyncMiddleware(async (request, response) => {
    const { id } = idSchema.parse(request.params);
    const product = await this.productService.getProductById(id);
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
