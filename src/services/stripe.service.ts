import { env } from "config/env";
import Stripe from "stripe";
import { LoggerService } from "./logger.service";
import { PaymentLineItem, PaymentsService } from "interfaces/payments.interface";

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

  public async createPaymentLink(orderId: number, lineItems: Array<PaymentLineItem>) {
    try {
      return await this.stripe.paymentLinks.create({
        line_items: lineItems.map((item) => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: item.name,
              description: item.description,
              images: item.image_url ? [item.image_url] : undefined,
              metadata: {
                product_id: item.product_id.toString()
              }
            },
            unit_amount: item.price_in_cents
          },
          quantity: item.quantity
        })),
        metadata: {
          order_id: orderId
        },
        automatic_tax: { enabled: true }
      });
    } catch (error) {
      this.logger.error(
        `Failed to create checkout payment link for order ${orderId}: ${String(error)}`
      );
      return null;
    }
  }

  public async constructEvent(payload: string | Buffer, sig: string) {
    return this.stripe.webhooks.constructEvent(payload, sig, env.STRIPE_WEBHOOK_SECRET);
  }
}
