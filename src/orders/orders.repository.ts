import {
  CreateOrderPayload,
  Order,
  OrderDetail,
  orderSchema,
  orderWithOrderDetailsSchema
} from "./orders.validation";
import { DatabaseService } from "interfaces/database.interface";
import { NotFoundError } from "api/api.errors";
import { PaymentLineItem } from "interfaces/payments.interface";
import { PoolClient } from "pg";

export class OrdersRepository {
  constructor(private readonly DB: DatabaseService) {}

  public createOrderWithOrderDetails(userId: number, payload: CreateOrderPayload) {
    return this.DB.withTransaction(async (client) => {
      await this.lockProductsOrThrow(client, payload.line_items);

      const orderResult = await client.query<Order>(
        "INSERT INTO orders (buyer_id) VALUES ($1) RETURNING *",
        [userId]
      );
      const order = orderSchema.parse(orderResult.rows[0]);

      const orderDetailsResult = await client.query<OrderDetail>(
        `
          INSERT INTO order_details (order_id, product_id, quantity, unit_price_in_cents)
          SELECT $1, v.product_id, v.quantity, p.price_in_cents
          FROM unnest($2::int[], $3::int[]) AS v(product_id, quantity)
          JOIN products p ON p.id = v.product_id
          RETURNING *
        `,
        [
          order.id,
          payload.line_items.map((item) => item.product_id),
          payload.line_items.map((item) => item.quantity)
        ]
      );

      return orderWithOrderDetailsSchema.parse({
        ...order,
        order_details: orderDetailsResult.rows
      });
    });
  }

  private async lockProductsOrThrow(
    client: PoolClient,
    line_items: CreateOrderPayload["line_items"]
  ) {
    // Lock referenced products so they can't be deleted before the details insert.
    const productIds = [...new Set(line_items.map((item) => item.product_id))];
    const productsResult = await client.query<{ id: number }>(
      "SELECT id FROM products WHERE id = ANY($1::int[]) FOR KEY SHARE",
      [productIds]
    );
    const foundIds = new Set(productsResult.rows.map((row) => row.id));
    const missingIds = productIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundError(`Products not found: ${missingIds.join(", ")}`);
    }
  }

  async getPaymentLineItems(orderId: number) {
    const result = await this.DB.query<PaymentLineItem>(
      `SELECT od.product_id, p.name, p.description, p.image_url, od.quantity,
              od.unit_price_in_cents AS price_in_cents
       FROM order_details od
       JOIN products p ON p.id = od.product_id
       WHERE od.order_id = $1
       ORDER BY od.id`,
      [orderId]
    );
    return result.rows;
  }

  async confirmOrder(orderId: number) {
    const result = await this.DB.query<Order>(
      "UPDATE orders SET status = 'paid' WHERE id = $1 RETURNING *",
      [orderId]
    );
    return result.rows[0];
  }
}
