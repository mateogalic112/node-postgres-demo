import { env } from "config/env";
import Stripe from "stripe";
import { LoggerService } from "./logger.service";
import { PaymentsService } from "interfaces/payments.interface";
import { ProductRepository } from "products/products.repository";
import { PostgresService } from "./postgres.service";
import { OrderWithOrderDetails } from "orders/orders.validation";

export class StripeService implements PaymentsService {
  private static instance: StripeService;
  private readonly stripe: Stripe;
  private readonly logger: LoggerService;
  private readonly productRepository: ProductRepository;

  private constructor(productRepository: ProductRepository) {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY);
    this.logger = LoggerService.getInstance();
    this.productRepository = productRepository;
  }

  public static getInstance() {
    if (!StripeService.instance) {
      const productRepository = new ProductRepository(PostgresService.getInstance());
      StripeService.instance = new StripeService(productRepository);
    }
    return StripeService.instance;
  }

  public async createCheckoutSession(order: OrderWithOrderDetails) {
    const products = await this.productRepository.findProductsByIds(
      order.order_details.map((item) => item.product_id)
    );
    const checkoutSession = await this.stripe.checkout.sessions.create({
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
        quantity: order.order_details.find((item) => item.product_id === product.id)?.quantity ?? 1
      })),
      mode: "payment",
      metadata: {
        order_id: order.id
      },
      success_url: `${env.FRONTEND_URL}/orders/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/orders/${order.id}?canceled=true`,
      automatic_tax: { enabled: true }
    });
    this.logger.log(`Checkout session created for order ${order.id}: ${checkoutSession}`);
    return checkoutSession;
  }

  public constructEvent(payload: string | Buffer, sig: string) {
    return this.stripe.webhooks.constructEvent(payload, sig, env.STRIPE_WEBHOOK_SECRET);
  }
}
