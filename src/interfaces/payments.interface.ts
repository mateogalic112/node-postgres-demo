import { Product } from "products/products.validation";

export interface PaymentsService {
  createPaymentLink: (
    lineItems: Array<{ product: Product; quantity: number }>
  ) => Promise<string | null>;
}
