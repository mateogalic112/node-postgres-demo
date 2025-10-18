import Stripe from "stripe";

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
    orderId: number,
    lineItems: Array<PaymentLineItem>
  ) => Promise<Stripe.Response<Stripe.Checkout.Session>>;

  constructEvent: (payload: string | Buffer, sig: string) => Promise<Stripe.Event>;
}
