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

export class OrdersRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async createOrderWithOrderDetails(userId: number, payload: CreateOrderPayload) {
    const client = await this.DB.getClient();
    try {
      await client.query("BEGIN");

      // Lock referenced products so they can't be deleted before the details insert.
      const productIds = [...new Set(payload.line_items.map((item) => item.product_id))];
      const productsResult = await client.query<{ id: number }>(
        "SELECT id FROM products WHERE id = ANY($1::int[]) FOR KEY SHARE",
        [productIds]
      );
      const foundIds = new Set(productsResult.rows.map((row) => row.id));
      const missingIds = productIds.filter((id) => !foundIds.has(id));
      if (missingIds.length > 0) {
        throw new NotFoundError(`Products not found: ${missingIds.join(", ")}`);
      }

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

      if (orderDetailsResult.rows.length !== payload.line_items.length) {
        throw new NotFoundError("One or more products in the order do not exist");
      }

      await client.query("COMMIT");

      return orderWithOrderDetailsSchema.parse({
        ...order,
        order_details: orderDetailsResult.rows
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
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
