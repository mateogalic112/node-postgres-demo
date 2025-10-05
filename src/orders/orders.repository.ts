import { User } from "users/users.validation";
import { CreateOrderDetailPayload, CreatedOrder } from "./orders.validation";
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
    payload: { line_items: { product_id: number; quantity: number }[] }
  ) {
    // Create a VALUES clause for the line items and join with products to get prices
    const values = payload.line_items
      .map((_, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`)
      .join(", ");

    const result = await client.query<CreateOrderDetailPayload>(
      `INSERT INTO order_details (order_id, product_id, quantity, total_price_in_cents)
      SELECT v.order_id, v.product_id, v.quantity, (v.quantity * p.price_in_cents)
      FROM (VALUES ${values}) AS v(order_id, product_id, quantity)
      JOIN products p ON p.id = v.product_id
      RETURNING *`,
      payload.line_items.map((item) => [orderId, item.product_id, item.quantity])
    );
    return result.rows;
  }
}
