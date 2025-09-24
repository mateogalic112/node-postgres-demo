import { env } from "config/env";
import { PaymentsService } from "interfaces/payments.interface";
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

  public async createCustomer(email: string) {
    try {
      const customer = await this.stripe.customers.create({
        email
      });
      return customer.id;
    } catch (error) {
      this.logger.error(String(error));
      return null;
    }
  }
}
