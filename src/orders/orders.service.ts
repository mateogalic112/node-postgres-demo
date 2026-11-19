import { User } from "users/users.validation";
import { OrdersRepository } from "./orders.repository";
import {
  CreateOrderPayload,
  OrderWithOrderDetails,
  orderWithOrderDetailsSchema,
  orderSchema,
  Order
} from "./orders.validation";

export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async createOrderWithOrderDetails(user: User, payload: CreateOrderPayload) {
    const result = await this.ordersRepository.createOrderWithOrderDetails(user, payload);
    return this.toOrderWithOrderDetails(result);
  }

  async getPaymentLineItems(orderId: number) {
    return this.ordersRepository.findPaymentLineItems(orderId);
  }

  async confirmOrder(orderId: number) {
    const result = await this.ordersRepository.confirmOrder(orderId);
    return this.toOrder(result);
  }

  private toOrderWithOrderDetails(data: unknown): OrderWithOrderDetails {
    return orderWithOrderDetailsSchema.parse(data);
  }

  private toOrder(data: unknown): Order {
    return orderSchema.parse(data);
  }
}
