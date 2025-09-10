import { CreateProductTemplate, MailService } from "interfaces/mail.interface";
import { ProductRepository } from "./products.repository";
import { CreateProductPayload, productSchema } from "./products.validation";
import { PaginatedRequestParams } from "api/api.validations";
import { User } from "users/users.validation";
import { FilesService } from "interfaces/files.interface";
import { NotFoundError } from "api/api.errors";
import { EmbeddingService } from "services/embedding.service";

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
    const product = await this.productRepository.findProductById(id);
    if (!product) {
      throw new NotFoundError(`Product with id ${id} not found`);
    }
    return productSchema.parse(product);
  }

  public async createProduct({ user, payload }: { user: User; payload: CreateProductPayload }) {
    const imageUrl = payload.file
      ? await this.filesService.uploadFile(payload.file, `products/${crypto.randomUUID()}`)
      : null;

    const newProduct = await this.productRepository.createProduct(user, {
      ...payload.body,
      imageUrl
    });

    const embeddings = await EmbeddingService.getInstance().generateEmbeddings(
      newProduct.description
    );

    await this.productRepository.createEmbedding(newProduct.id, embeddings);

    this.mailService.sendEmail({
      to: user.email,
      template: CreateProductTemplate.getTemplate(newProduct)
    });

    return productSchema.parse(newProduct);
  }
}
