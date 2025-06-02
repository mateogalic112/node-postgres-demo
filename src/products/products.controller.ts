import { Controller } from "api/api.controllers";
import { ProductService } from "./products.service";
import { createProductSchema } from "./products.validation";
import authMiddleware from "middleware/auth.middleware";
import asyncMiddleware from "middleware/async.middleware";
import { paginatedRequestSchema } from "api/api.validations";
import { Database } from "api/api.database";
import { UsersRepository } from "users/users.repository";
import { fileMiddleware } from "middleware/file.middleware";
import { FilesService } from "api/api.files";

export class ProductController extends Controller {
  constructor(
    private readonly db: Database,
    private readonly productService: ProductService,
    private readonly filesService: FilesService
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
    const { limit, cursor } = paginatedRequestSchema.parse(request).query;
    const products = await this.productService.getProducts({
      limit,
      cursor
    });
    response.json(products);
  });

  private createProduct = asyncMiddleware(async (request, response) => {
    const payload = createProductSchema.parse(request).body;

    // Upload file to S3 if present
    if (request.file) {
      const key = `products/${crypto.randomUUID()}`;
      const isUploaded = await this.filesService.uploadFile(request.file, key);
      if (isUploaded) {
        payload.image_url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      }
    }

    const product = await this.productService.createProduct(payload);
    response.status(201).json(product);
  });
}
