import { env } from "config/env";
import Stripe from "stripe";
import { PaymentDetails, PaymentsService } from "interfaces/payments.interface";
import { DatabaseUser } from "users/users.validation";
import { LoggerService } from "interfaces/logger.interface";

export class StripeService implements PaymentsService {
  private readonly stripe: Stripe;

  constructor(private readonly logger: LoggerService) {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }

  public async createCustomer(user: DatabaseUser) {
    try {
      return await this.stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id
        }
      });
    } catch (err) {
      this.logger.error(String(err));
      return null;
    }
  }

  public async pay({ orderId, customerId, lineItems }: PaymentDetails) {
    try {
      return await this.stripe.checkout.sessions.create({
        customer: customerId,
        line_items: lineItems.map((item) => ({
          price_data: {
            currency: "eur",
            product_data: {
              name: item.name,
              description: item.description,
              images: item.image_url ? [item.image_url] : undefined,
              metadata: {
                product_id: item.product_id
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
        success_url: `${env.FRONTEND_URL}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.FRONTEND_URL}/orders/canceled?canceled=true`
      });
    } catch (err) {
      this.logger.error(String(err));
      return null;
    }
  }

  public constructEvent(payload: string | Buffer, sig: string) {
    return this.stripe.webhooks.constructEvent(payload, sig, env.STRIPE_WEBHOOK_SECRET);
  }
}
