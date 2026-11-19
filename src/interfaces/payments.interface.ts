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
    orderId: number,
    lineItems: PaymentLineItem[],
    customerId: string
  ) => Promise<{ id: string; url: string | null } | null>;

  createCustomer: (user: User) => Promise<{ id: string } | null>;

  constructEvent: (payload: string | Buffer, signature: string) => { type: string };
}
