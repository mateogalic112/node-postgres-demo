import { User } from "users/users.validation";
import {
  CreateOrderDetailPayload,
  CreateOrderPayload,
  CreatedOrder,
  createOrderDetailSchema,
  orderSchema
} from "./orders.validation";
import { DatabaseService } from "interfaces/database.interface";

export class OrderRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async createOrder(user: User, payload: CreateOrderPayload) {
    const client = await this.DB.getClient();

    const orderResult = await client.query<CreatedOrder>(
      "INSERT INTO orders (buyer_id) VALUES ($1) RETURNING *",
      [user.id]
    );
    const order = orderSchema.parse(orderResult.rows[0]);

    const orderDetailsResult = await client.query<CreateOrderDetailPayload>(
      `INSERT INTO order_details (order_id, product_id, quantity)
      VALUES ${payload.line_items
        .map((_, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`)
        .join(", ")}
      RETURNING *`,
      payload.line_items.flatMap((item) => [order.id, item.product_id, item.quantity])
    );

    const orderDetails = orderDetailsResult.rows.map((detail) =>
      createOrderDetailSchema.parse(detail)
    );

    return { ...order, order_details: orderDetails };
  }
}
