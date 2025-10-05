import { User } from "users/users.validation";
import { CreateOrderPayload, Order, OrderDetail } from "./orders.validation";
import { DatabaseService } from "interfaces/database.interface";

export class OrderRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async createOrderWithOrderDetails(user: User, payload: CreateOrderPayload) {
    const client = await this.DB.getClient();

    const orderResult = await client.query<Order>(
      "INSERT INTO orders (buyer_id) VALUES ($1) RETURNING *",
      [user.id]
    );

    const order = orderResult.rows[0];

    const orderDetailsResult = await client.query<OrderDetail>(
      `INSERT INTO order_details (order_id, product_id, quantity)
      VALUES ${payload.line_items
        .map((_, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`)
        .join(", ")}
      RETURNING *`,
      payload.line_items.flatMap((item) => [order.id, item.product_id, item.quantity])
    );

    return { ...order, order_details: orderDetailsResult.rows };
  }

  async confirmOrder(orderId: number) {
    const result = await this.DB.query<Order>(
      "UPDATE orders SET status = 'paid' WHERE id = $1 RETURNING *",
      [orderId]
    );
    return result.rows[0];
  }
}
