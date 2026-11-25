import { FilesService } from "interfaces/files.interface";
import { CreateProductPayload } from "./products.validation";

export class ProductFactory {
  constructor(private readonly filesService: FilesService) {}

  public async createProduct(raw: CreateProductPayload) {
    const imageUrl = await this.filesService.uploadFile({
      file: raw.file,
      key: `products/${crypto.randomUUID()}`
    });
    return { ...raw.body, imageUrl };
  }
}
