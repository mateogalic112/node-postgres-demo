export interface PaymentLineItem {
  product_id: number;
  name: string;
  description: string;
  image_url: string | null;
  quantity: number;
  price_in_cents: number;
}

export interface PaymentsService {
  createPaymentLink: (lineItems: Array<PaymentLineItem>) => Promise<string | null>;
}
