import { DatabaseUser } from "users/users.validation";

export interface PaymentLineItem {
  product_id: number;
  name: string;
  description: string;
  image_url: string | null;
  quantity: number;
  price_in_cents: number;
}

export interface PaymentDetails {
  orderId: number;
  customerId: string;
  lineItems: PaymentLineItem[];
}

export interface PaymentsService {
  pay: (payload: PaymentDetails) => Promise<{ id: string; url: string | null } | null>;
  createCustomer: (user: DatabaseUser) => Promise<{ id: string } | null>;
  constructEvent: (payload: string | Buffer, signature: string) => { type: string };
}
