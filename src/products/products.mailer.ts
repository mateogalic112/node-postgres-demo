import { Product } from "./products.validation";

export class ProductsMailer {
  public static createProductTemplate(product: Product) {
    return {
      subject: "New product created",
      html: `<strong>New product created</strong> ${product.name}`
    };
  }
}
