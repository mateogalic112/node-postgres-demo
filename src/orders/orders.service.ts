import { User } from "users/users.validation";
import { OrderRepository } from "./orders.repository";
import {
  createdOrderSchema,
  CreateOrderPayload,
  createOrderDetailsSchema,
  orderSchema,
  populatedOrderSchema
} from "./orders.validation";
import { DatabaseService } from "interfaces/database.interface";
import { LoggerService } from "services/logger.service";
import { ProductRepository } from "products/products.repository";

export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly DB: DatabaseService,
    private readonly logger: LoggerService
  ) {}

  public async createOrder({ user, payload }: { user: User; payload: CreateOrderPayload }) {
    const client = await this.DB.getClient();

    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");

      const newOrderResult = await this.orderRepository.createOrder(client, user);
      const newOrder = createdOrderSchema.parse(newOrderResult);

      const productPrices = await this.productRepository.findProductPricesByIds(
        client,
        payload.line_items.map((item) => item.product_id)
      );
      const productPricesMap = new Map(productPrices.map((item) => [item.id, item.price_in_cents]));

      const parsedPayload = {
        line_items: payload.line_items.map((item) => ({
          ...item,
          price_in_cents: productPricesMap.get(item.product_id) as number
        }))
      };

      const orderDetailsResult = await this.orderRepository.createOrderDetails(
        client,
        newOrder.id,
        parsedPayload
      );
      const orderDetails = createOrderDetailsSchema.parse(orderDetailsResult);

      await client.query("COMMIT");

      return orderSchema.parse({
        id: newOrder.id,
        buyer_id: newOrder.buyer_id,
        order_details: orderDetails,
        created_at: newOrder.created_at,
        updated_at: newOrder.updated_at
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

  public async getPopulatedOrder(orderId: number) {
    return populatedOrderSchema.parse(await this.orderRepository.getPopulatedOrder(orderId));
  }
}
