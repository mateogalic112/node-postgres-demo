import { CreateProductTemplate, MailService } from "interfaces/mail.interface";
import { ProductRepository } from "./products.repository";
import { CreateProductPayload, Product, productSchema } from "./products.validation";
import { PaginatedRequestParams } from "api/api.validations";
import { User } from "users/users.validation";
import { FilesService } from "interfaces/files.interface";
import { BadRequestError, NotFoundError } from "api/api.errors";

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

  public async findProductById(id: number) {
    const product = await this.productRepository.findProductById(id);
    if (!product) {
      return null;
    }
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

  public async getProductById(id: number) {
    const product = await this.productRepository.findProductById(id);
    if (!product) {
      throw new NotFoundError(`Product with id ${id} not found`);
    }
    return productSchema.parse(product);
  }

  public async assertProductOwner(product: Product, user: User) {
    if (product.owner_id === user.id) {
      throw new BadRequestError("You are not the owner of this product");
    }
  }
}
