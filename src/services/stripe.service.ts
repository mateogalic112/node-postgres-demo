import { env } from "config/env";
import { PaymentsService } from "interfaces/payments.interface";
import { Product } from "products/products.validation";
import Stripe from "stripe";

export class StripeService implements PaymentsService {
  private static instance: StripeService;
  private readonly stripe: Stripe;

  private constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }

  public static getInstance() {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  public async createProduct(product: Product) {
    const newProduct = await this.stripe.products.create({
      name: product.name,
      description: product.description,
      images: product.image_url ? [product.image_url] : undefined
    });

    return newProduct.id;
  }
}
