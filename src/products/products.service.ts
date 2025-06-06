import { CreateProductTemplate, MailService } from "interfaces/mail.interface";
import { ProductRepository } from "./products.repository";
import { CreateProductPayload, productSchema } from "./products.validation";
import { PaginatedRequestParams } from "api/api.validations";
import { User } from "users/users.validation";
import { FilesService } from "interfaces/files.interface";

export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly mailService: MailService,
    private readonly filesService: FilesService
  ) {}

  public async getProducts(params: PaginatedRequestParams) {
    const products = await this.productRepository.getProducts(params);
    return products.map((product) => productSchema.parse(product));
  }

  public async getProductById(id: number) {
    const product = await this.productRepository.getProductById(id);
    if (!product) return null;

    return productSchema.parse(product);
  }

  public async createProduct({ user, payload }: { user: User; payload: CreateProductPayload }) {
    const imageUrl = payload.file
      ? await this.filesService.uploadFile(payload.file, `products/${crypto.randomUUID()}`)
      : null;

    const product = await this.productRepository.createProduct({
      userId: user.id,
      payload: {
        ...payload.body,
        imageUrl
      }
    });

    this.mailService.sendEmail({
      to: user.email,
      template: CreateProductTemplate.getTemplate(product)
    });

    return productSchema.parse(product);
  }
}
