import { User } from "users/users.validation";
import { OrderRepository } from "./orders.repository";
import {
  CreateOrderPayload,
  OrderWithOrderDetails,
  orderWithOrderDetailsSchema,
  orderSchema
} from "./orders.validation";
import { CreateOrderTemplate, MailService } from "interfaces/mail.interface";

export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
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

  async confirmOrder(orderId: number, buyerEmail: string) {
    const orderResult = await this.orderRepository.confirmOrder(orderId);
    const order = orderSchema.parse(orderResult);

    this.mailService.sendEmail({
      to: buyerEmail,
      template: CreateOrderTemplate.getTemplate(order)
    });
  }
}
