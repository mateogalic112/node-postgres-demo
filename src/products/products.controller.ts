import { HttpController } from "api/api.controllers";
import { ProductsService } from "./products.service";
import {
  createProductSchema,
  getRelevantProductsSchema,
  productImageSchema
} from "./products.validation";
import authMiddleware from "middleware/auth.middleware";
import asyncMiddleware from "middleware/async.middleware";
import { idSchema, paginatedRequestSchema } from "api/api.validations";
import { fileMiddleware } from "middleware/file.middleware";
import { userSchema } from "users/users.validation";
import { formatPaginatedResponse, formatResponse } from "api/api.formats";
import { CreateProductTemplate, MailService } from "interfaces/mail.interface";
import { UsersRepository } from "users/users.repository";
import { ProductsRepository } from "./products.repository";
import { FilesService } from "interfaces/files.interface";
import { ProductFactory } from "./products.factory";

export class ProductsHttpController extends HttpController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productsRepository: ProductsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly mailService: MailService,
    private readonly filesService: FilesService
  ) {
    super("/products");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}`, this.getProducts);
    this.router.get(`${this.path}/relevant-products`, this.findRelevantProducts);
    this.router.get(`${this.path}/:id`, this.getProductById);
    this.router.post(
      `${this.path}`,
      authMiddleware(this.usersRepository),
      fileMiddleware({
        limitMB: productImageSchema.maxSizeMB,
        allowedFormats: productImageSchema.allowedFormats
      }).single("image"),
      this.createProduct
    );
  }

  private getProducts = asyncMiddleware(async (request, response) => {
    const { limit, cursor } = paginatedRequestSchema.parse(request.query);
    const products = await this.productsRepository.getProducts({ limit, cursor });
    response.json(formatPaginatedResponse(products, limit));
  });

  private getProductById = asyncMiddleware(async (request, response) => {
    const { id } = idSchema.parse(request.params);
    const product = await this.productsService.getProductById(id);
    response.json(formatResponse(product));
  });

  private findRelevantProducts = asyncMiddleware(async (request, response) => {
    const { query } = getRelevantProductsSchema.parse(request.query);
    const products = await this.productsService.findRelevantProducts(query);
    response.json(formatResponse(products));
  });

  private createProduct = asyncMiddleware(async (request, response) => {
    const user = userSchema.parse(response.locals.user);
    const raw = createProductSchema.parse(request);
    const payload = await new ProductFactory(this.filesService).createPayload(raw);
    const newProduct = await this.productsRepository.createProduct(user.id, payload);

    await this.productsService.createProductEmbedding(newProduct);
    await this.mailService.sendEmail({
      to: user.email,
      template: CreateProductTemplate.getTemplate(newProduct)
    });
    response.status(201).json(formatResponse(newProduct));
  });
}
