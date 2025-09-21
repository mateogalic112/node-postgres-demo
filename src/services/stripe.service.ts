import { env } from "config/env";
import { PaymentsService } from "interfaces/payments.interface";
import { Product } from "products/products.validation";
import Stripe from "stripe";
import { LoggerService } from "./logger.service";
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

  public async createProduct(product: Product) {
    try {
      const newProduct = await this.stripe.products.create({
        name: product.name,
        description: product.description,
        images: product.image_url ? [product.image_url] : undefined
      });

      await this.stripe.prices.create({
        product: newProduct.id,
        unit_amount: product.price_in_cents,
        currency: "eur"
      });

      return newProduct.id;
    } catch (error) {
      this.logger.error(String(error));
      return null;
    }
  }
}
