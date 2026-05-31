import { User } from "users/users.validation";
import { CreateOrderPayload, Order, OrderDetail } from "./orders.validation";
import { DatabaseService } from "interfaces/database.interface";
import { NotFoundError } from "api/api.errors";

export class OrderRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async createOrderWithOrderDetails(user: User, payload: CreateOrderPayload) {
    const client = await this.DB.getClient();
    try {
      await client.query("BEGIN");

      const orderResult = await client.query<Order>(
        "INSERT INTO orders (buyer_id) VALUES ($1) RETURNING *",
        [user.id]
      );

      const order = orderResult.rows[0];

      const valuesPlaceholders = payload.line_items
        .map(
          (_, index) =>
            `($${index * 3 + 1}::integer, $${index * 3 + 2}::integer, $${index * 3 + 3}::integer)`
        )
        .join(", ");

      const valuesParams = payload.line_items.flatMap((item) => [
        order.id,
        item.product_id,
        item.quantity
      ]);

      const orderDetailsResult = await client.query<OrderDetail>(
        `
          INSERT INTO order_details (order_id, product_id, quantity, unit_price_in_cents)
          SELECT v.order_id, v.product_id, v.quantity, p.price_in_cents
          FROM (VALUES ${valuesPlaceholders}) AS v(order_id, product_id, quantity)
          JOIN products p ON p.id = v.product_id
          RETURNING *
        `,
        valuesParams
      );

      if (orderDetailsResult.rows.length !== payload.line_items.length) {
        throw new NotFoundError("One or more products in the order do not exist");
      }

      await client.query("COMMIT");
      return { ...order, order_details: orderDetailsResult.rows };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmOrder(orderId: number) {
    const result = await this.DB.query<Order>(
      "UPDATE orders SET status = 'paid' WHERE id = $1 RETURNING *",
      [orderId]
    );
    return result.rows[0];
  }
}
