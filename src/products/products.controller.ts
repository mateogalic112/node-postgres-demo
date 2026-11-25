import { HttpController } from "api/api.controllers";
import { createProductSchema, MAX_IMAGE_SIZE_IN_MB } from "./products.validation";
import authMiddleware from "middleware/auth.middleware";
import asyncMiddleware from "middleware/async.middleware";
import { idSchema, paginatedRequestSchema } from "api/api.validations";
import { fileMiddleware } from "middleware/file.middleware";
import { userSchema } from "users/users.validation";
import { formatPaginatedResponse, formatResponse } from "api/api.formats";
import { UsersRepository } from "users/users.repository";
import { ProductsRepository } from "./products.repository";
import { FilesService } from "interfaces/files.interface";
import { ProductFactory } from "./products.factory";
import { NotFoundError } from "api/api.errors";
import { EventBus } from "events/events.bus";

export class ProductsHttpController extends HttpController {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly filesService: FilesService,
    private readonly eventBus: EventBus
  ) {
    super("/products");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}`, this.getProducts);
    this.router.get(`${this.path}/:id`, this.getProductById);
    this.router.post(
      `${this.path}`,
      authMiddleware(this.usersRepository),
      fileMiddleware(MAX_IMAGE_SIZE_IN_MB).single("image"),
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
    const product = await this.productsRepository.findProductById(id);
    if (!product) {
      throw new NotFoundError("Product not found!");
    }
    response.json(formatResponse(product));
  });

  private createProduct = asyncMiddleware(async (request, response) => {
    const user = userSchema.parse(response.locals.user);
    const payload = createProductSchema.parse(request);

    const productFactory = new ProductFactory(this.filesService);
    const productDTO = await productFactory.createProductDTO(payload);
    const product = await this.productsRepository.save(user.id, productDTO);

    this.eventBus.emit("product.created", { product, mailTo: user.email });
    response.status(201).json(formatResponse(product));
  });
}
