import { Product } from "products/products.validation";

export interface MailTemplate {
  subject: string;
  html: string;
}

export interface MailService {
  sendEmail({ to, template }: { to: string; template: MailTemplate }): Promise<string | null>;
}

export enum MailTemplateType {
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
  public static getTemplate(template: MailTemplateType) {
    switch (template) {
      case MailTemplateType.CREATE_PRODUCT:
        return CreateProductTemplate.getTemplate;
    }
  }
}
