import { Product } from "products/products.validation";

export interface MailService {
  sendEmail({
    to,
    subject,
    html
  }: {
    to: string;
    subject: string;
    html: string;
  }): Promise<string | null>;
}

export enum MailTemplate {
  CREATE_PRODUCT = "create_product"
}

class CreateProductTemplate {
  public static getTemplate(product: Product) {
    return {
      subject: "New product created",
      html: `<strong>New product created</strong> ${product.name}`
    };
  }
}

export class MailTemplateFactory {
  public static getTemplate(template: MailTemplate) {
    switch (template) {
      case MailTemplate.CREATE_PRODUCT:
        return CreateProductTemplate.getTemplate;
    }
  }
}
