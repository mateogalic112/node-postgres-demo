import { env } from "config/env";
import Stripe from "stripe";
import { LoggerService } from "./logger.service";
import { Product } from "products/products.validation";
import { PaymentsService } from "interfaces/payments.interface";

export class StripeService implements PaymentsService {
  private static instance: StripeService;
  private readonly stripe: Stripe;
  private readonly logger: LoggerService;

  private constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY);
    this.logger = LoggerService.getInstance();
  }

  public static getInstance() {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  public async createPaymentLink(
    lineItems: Array<{ product: Product; quantity: number }>
  ): Promise<string | null> {
    try {
      const paymentLink = await this.stripe.paymentLinks.create({
        line_items: lineItems.map((item) => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: item.product.name,
              description: item.product.description,
              images: item.product.image_url ? [item.product.image_url] : undefined,
              metadata: {
                product_id: item.product.id.toString(),
                owner_id: item.product.owner_id.toString()
              }
            },
            unit_amount: item.product.price_in_cents
          },
          quantity: item.quantity
        })),
        automatic_tax: { enabled: true }
      });

      this.logger.log(`Created checkout session: ${paymentLink.id} for ${lineItems.length} items`);
      return paymentLink.url;
    } catch (error) {
      this.logger.error(`Failed to create checkout session: ${String(error)}`);
      return null;
    }
  }
}
