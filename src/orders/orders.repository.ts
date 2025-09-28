import { User } from "users/users.validation";
import { Order, CreateOrderDetailPayload } from "./orders.validation";
import { PoolClient } from "pg";

export class OrderRepository {
  constructor() {}

  public async createOrder(client: PoolClient, user: User) {
    const result = await client.query<Order>(
      "INSERT INTO orders (buyer_id) VALUES ($1) RETURNING *",
      [user.id]
    );
    return result.rows[0];
  }

  public async createOrderDetails(
    client: PoolClient,
    orderId: number,
    payload: { line_items: { product_id: number; quantity: number; price_in_cents: number }[] }
  ) {
    const result = await client.query<CreateOrderDetailPayload>(
      `INSERT INTO order_details (order_id, product_id, quantity, total_price_in_cents) 
      VALUES ${payload.line_items.map((_, index) => `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4})`).join(", ")} 
      RETURNING *`,
      payload.line_items.flatMap((detail) => [
        orderId,
        detail.product_id,
        detail.quantity,
        detail.price_in_cents
      ])
    );
    return result.rows;
  }
}
