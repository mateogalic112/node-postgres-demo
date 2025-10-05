import { User } from "users/users.validation";
import { OrderRepository } from "./orders.repository";
import {
  CreateOrderPayload,
  OrderWithOrderDetails,
  orderWithOrderDetailsSchema,
  orderSchema
} from "./orders.validation";
import { PaymentsService } from "interfaces/payments.interface";
import { ProductService } from "products/products.service";
import { BadRequestError } from "api/api.errors";
import { CreateOrderTemplate, MailService } from "interfaces/mail.interface";

export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productService: ProductService,
    private readonly paymentsService: PaymentsService,
    private readonly mailService: MailService
  ) {}

  async createOrderWithOrderDetails({
    user,
    payload
  }: {
    user: User;
    payload: CreateOrderPayload;
  }): Promise<OrderWithOrderDetails> {
    const newOrderResult = await this.orderRepository.createOrderWithOrderDetails(user, payload);
    return orderWithOrderDetailsSchema.parse(newOrderResult);
  }

  async getPaymentLink(orderId: number, payload: CreateOrderPayload) {
    const products = await this.productService.getProductsByIds(
      payload.line_items.map((item) => item.product_id)
    );

    return this.paymentsService.createPaymentLink(
      orderId,
      products.map((product) => ({
        product_id: product.id,
        name: product.name,
        description: product.description,
        image_url: product.image_url,
        price_in_cents: product.price_in_cents,
        quantity: payload.line_items.find((item) => item.product_id === product.id)?.quantity ?? 1
      }))
    );
  }

  async confirmOrder(orderId: number | undefined, buyerEmail: string | undefined) {
    if (!orderId) {
      throw new BadRequestError("Order ID is missing to confirm order");
    }
    if (!buyerEmail) {
      throw new BadRequestError("Buyer email is missing to confirm order");
    }
    const orderResult = await this.orderRepository.confirmOrder(orderId);
    const order = orderSchema.parse(orderResult);

    this.mailService.sendEmail({
      to: buyerEmail,
      template: CreateOrderTemplate.getTemplate(order)
    });
  }
}
