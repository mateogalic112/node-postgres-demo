import { OrderWithOrderDetails } from "orders/orders.validation";
import Stripe from "stripe";
import { User } from "users/users.validation";

export interface PaymentLineItem {
  product_id: number;
  name: string;
  description: string;
  image_url: string | null;
  quantity: number;
  price_in_cents: number;
}

export interface PaymentsService {
  createCheckoutSession: (
    order: OrderWithOrderDetails,
    customerId: string
  ) => Promise<Stripe.Response<Stripe.Checkout.Session> | null>;

  createCustomer: (user: User) => Promise<Stripe.Response<Stripe.Customer> | null>;

  constructEvent: (payload: string | Buffer, sig: string) => Stripe.Event;
}
