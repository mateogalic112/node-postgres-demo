import { User } from "users/users.validation";
import { CreateOrderDetailPayload, CreateOrderPayload, CreatedOrder } from "./orders.validation";
import { PoolClient } from "pg";

export class OrderRepository {
  constructor() {}

  public async createOrder(client: PoolClient, user: User) {
    const result = await client.query<CreatedOrder>(
      "INSERT INTO orders (buyer_id) VALUES ($1) RETURNING *",
      [user.id]
    );
    return result.rows[0];
  }

  public async createOrderDetails(
    client: PoolClient,
    orderId: number,
    payload: CreateOrderPayload
  ) {
    // Create a VALUES clause for the line items (order_id, product_id, quantity)
    const values = payload.line_items
      .map((_, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`)
      .join(", ");

    const result = await client.query<CreateOrderDetailPayload>(
      `INSERT INTO order_details (order_id, product_id, quantity)
      VALUES ${values}
      RETURNING *`,
      payload.line_items.flatMap((item) => [orderId, item.product_id, item.quantity])
    );
    return result.rows;
  }
}
