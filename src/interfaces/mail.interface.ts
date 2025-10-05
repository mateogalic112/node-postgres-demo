import { Auction } from "auctions/auctions.validation";
import { Order } from "orders/orders.validation";
import { Product } from "products/products.validation";

export interface MailTemplate {
  subject: string;
  html: string;
}

export interface MailService {
  sendEmail({ to, template }: { to: string; template: MailTemplate }): Promise<string | null>;
}

export class CreateProductTemplate {
  public static getTemplate(product: Product) {
    return {
      subject: "New product created",
      html: `<strong>New product created</strong> ${product.name}`
    };
  }
}

export class CreateAuctionTemplate {
  public static getTemplate(auction: Auction) {
    return {
      subject: "New auction created",
      html: `<strong>New auction created</strong> Starting price: ${auction.starting_price_in_cents}</p><p>Start time: ${auction.start_time}</p><p>Duration: ${auction.duration_hours} hours</p>`
    };
  }
}

export class CreateOrderTemplate {
  public static getTemplate(order: Order) {
    return {
      subject: "New order created",
      html: `<strong>New order created</strong> Order ID: ${order.id}`
    };
  }
}
