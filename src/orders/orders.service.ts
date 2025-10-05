import { User } from "users/users.validation";
import { OrderRepository } from "./orders.repository";
import {
  createdOrderSchema,
  CreateOrderPayload,
  createOrderDetailsSchema,
  orderSchema,
  Order
} from "./orders.validation";
import { DatabaseService } from "interfaces/database.interface";
import { LoggerService } from "services/logger.service";

export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly DB: DatabaseService,
    private readonly logger: LoggerService
  ) {}

  public async createOrder({
    user,
    payload
  }: {
    user: User;
    payload: CreateOrderPayload;
  }): Promise<Order> {
    const client = await this.DB.getClient();

    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");

      const newOrderResult = await this.orderRepository.createOrder(client, user);
      const newOrder = createdOrderSchema.parse(newOrderResult);

      const orderDetailsResult = await this.orderRepository.createOrderDetails(
        client,
        newOrder.id,
        payload
      );
      const orderDetails = createOrderDetailsSchema.parse(orderDetailsResult);

      await client.query("COMMIT");

      return orderSchema.parse({
        ...newOrder,
        order_details: orderDetails
      });
    } catch (error) {
      console.log(error);
      await client.query("ROLLBACK");
      this.logger.error(
        `[FAILED_TO_CREATE_ORDER] Failed to create order for user ${user.id} with items ${payload.line_items.map((item) => item.product_id).join(", ")}`
      );
      throw error;
    } finally {
      client.release();
    }
  }
}
