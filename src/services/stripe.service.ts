import { env } from "config/env";
import Stripe from "stripe";
import { PaymentsService } from "interfaces/payments.interface";
import { ProductRepository } from "products/products.repository";
import { PostgresService } from "./postgres.service";
import { OrderWithOrderDetails } from "orders/orders.validation";
import { User } from "users/users.validation";
import { LoggerService } from "./logger.service";

export class StripeService implements PaymentsService {
  private static instance: StripeService;
  private readonly stripe: Stripe;
  private readonly productRepository: ProductRepository;
  private readonly logger: LoggerService;

  private constructor(productRepository: ProductRepository) {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY);
    this.productRepository = productRepository;
    this.logger = LoggerService.getInstance();
  }

  public static getInstance() {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService(
        new ProductRepository(PostgresService.getInstance())
      );
    }
    return StripeService.instance;
  }

  public async createCustomer(user: User) {
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

  public async createCheckoutSession(order: OrderWithOrderDetails, customerId: string) {
    try {
      const products = await this.productRepository.findProductsByIds(
        order.order_details.map((item) => item.product_id)
      );

      return await this.stripe.checkout.sessions.create({
        customer: customerId,
        line_items: products.map((product) => ({
          price_data: {
            currency: "eur",
            product_data: {
              name: product.name,
              description: product.description,
              images: product.image_url ? [product.image_url] : undefined,
              metadata: {
                product_id: product.id
              }
            },
            unit_amount: product.price_in_cents
          },
          quantity:
            order.order_details.find((item) => item.product_id === product.id)?.quantity ?? 1
        })),
        mode: "payment",
        metadata: {
          order_id: order.id
        },
        success_url: `${env.FRONTEND_URL}/orders/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.FRONTEND_URL}/orders/${order.id}?canceled=true`,
        automatic_tax: { enabled: true }
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
