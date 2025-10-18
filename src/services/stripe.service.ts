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

  public async createCheckoutSession(orderId: number, lineItems: Array<PaymentLineItem>) {
    return this.stripe.checkout.sessions.create({
      line_items: lineItems.map((item) => ({
        price_data: {
          currency: "eur",
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
      mode: "payment",
      metadata: {
        order_id: orderId
      },
      success_url: `${env.FRONTEND_URL}?success=true`,
      cancel_url: `${env.FRONTEND_URL}?canceled=true`,
      automatic_tax: { enabled: true }
    });
  }

  public async constructEvent(payload: string | Buffer, sig: string) {
    return this.stripe.webhooks.constructEvent(payload, sig, env.STRIPE_WEBHOOK_SECRET);
  }
}
