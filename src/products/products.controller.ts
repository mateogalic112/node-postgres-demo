import { Controller } from "api/api.controllers";
import { ProductService } from "./products.service";
import { createProductSchema } from "./products.validation";
import authMiddleware from "middleware/auth.middleware";
import asyncMiddleware from "middleware/async.middleware";
import { paginatedRequestSchema } from "api/api.validations";
import { DatabaseService } from "interfaces/database.interface";
import { UsersRepository } from "users/users.repository";
import { fileMiddleware } from "middleware/file.middleware";
import { FilesService } from "interfaces/files.interface";
import crypto from "crypto";
import { MailService, MailTemplateFactory, MailTemplateType } from "interfaces/mail.interface";
import { User } from "users/users.validation";

export class ProductController extends Controller {
  constructor(
    private readonly db: DatabaseService,
    private readonly productService: ProductService,
    private readonly filesService: FilesService,
    private readonly mailService: MailService
  ) {
    super("/products");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(`${this.path}`, this.getProducts);
    this.router.post(
      `${this.path}`,
      authMiddleware(new UsersRepository(this.db)),
      fileMiddleware({ limitMB: 5, allowedFormats: ".jpg|.jpeg|.png|.gif|.webp" }).single("image"),
      this.createProduct
    );
  }

  private getProducts = asyncMiddleware(async (request, response) => {
    const products = await this.productService.getProducts(
      paginatedRequestSchema.parse(request).query
    );
    response.json(products);
  });

  private createProduct = asyncMiddleware(async (request, response) => {
    const payload = createProductSchema.parse(request).body;

    // Upload file if present
    if (request.file) {
      payload.image_url = await this.filesService.uploadFile(
        request.file,
        `products/${crypto.randomUUID()}`
      );
    }

    const product = await this.productService.createProduct(payload);

    const user = response.locals.user as User;
    this.mailService.sendEmail({
      to: user.email,
      template: MailTemplateFactory.getTemplate(MailTemplateType.CREATE_PRODUCT)(product)
    });

    response.status(201).json(product);
  });
}
