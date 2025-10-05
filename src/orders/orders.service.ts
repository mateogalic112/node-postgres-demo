import { User } from "users/users.validation";
import { OrderRepository } from "./orders.repository";
import { CreateOrderPayload, orderSchema, Order } from "./orders.validation";
import { LoggerService } from "services/logger.service";
import { PaymentsService } from "interfaces/payments.interface";
import { ProductService } from "products/products.service";

export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productService: ProductService,
    private readonly logger: LoggerService,
    private readonly paymentsService: PaymentsService
  ) {}

  public async createOrder({
    user,
    payload
  }: {
    user: User;
    payload: CreateOrderPayload;
  }): Promise<Order> {
    const newOrderResult = await this.orderRepository.createOrder(user, payload);
    return orderSchema.parse(newOrderResult);
  }

  async getPaymentLink(payload: CreateOrderPayload) {
    try {
      const products = await this.productService.getProductsByIds(
        payload.line_items.map((item) => item.product_id)
      );

      return this.paymentsService.createPaymentLink(
        products.map((product) => ({
          product_id: product.id,
          name: product.name,
          description: product.description,
          image_url: product.image_url,
          price_in_cents: product.price_in_cents,
          quantity: payload.line_items.find((item) => item.product_id === product.id)?.quantity ?? 1
        }))
      );
    } catch (error) {
      this.logger.error(
        `[FAILED_TO_CREATE_PAYMENT_LINK] Failed to create payment link for order ${payload.line_items.map((item) => item.product_id).join(", ")}`
      );
      throw error;
    }
  }
}
