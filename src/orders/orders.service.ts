import { User } from "users/users.validation";
import { OrderRepository } from "./orders.repository";
import {
  CreateOrderPayload,
  OrderWithOrderDetails,
  orderWithOrderDetailsSchema,
  orderSchema
} from "./orders.validation";

export class OrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

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

  async confirmOrder(orderId: number) {
    const orderResult = await this.orderRepository.confirmOrder(orderId);
    return orderSchema.parse(orderResult);
  }
}
