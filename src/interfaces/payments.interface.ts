import { Product } from "products/products.validation";

export interface PaymentsService {
  createProduct: (product: Product) => Promise<string | null>;
}
