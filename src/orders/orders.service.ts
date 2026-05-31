import { User } from "users/users.validation";
import { OrderRepository } from "./orders.repository";
import {
  CreateOrderPayload,
  OrderWithOrderDetails,
  orderWithOrderDetailsSchema,
  orderSchema,
  Order
} from "./orders.validation";

export class OrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async createOrderWithOrderDetails(user: User, payload: CreateOrderPayload) {
    const result = await this.orderRepository.createOrderWithOrderDetails(user, payload);
    return this.toOrderWithOrderDetails(result);
  }

  async confirmOrder(orderId: number) {
    const result = await this.orderRepository.confirmOrder(orderId);
    return this.toOrder(result);
  }

  private toOrderWithOrderDetails(data: unknown): OrderWithOrderDetails {
    return orderWithOrderDetailsSchema.parse(data);
  }

  private toOrder(data: unknown): Order {
    return orderSchema.parse(data);
  }
}
