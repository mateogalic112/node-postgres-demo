import { User } from "users/users.validation";
import { Order, CreateOrderDetailPayload, OrderDetail, PopulatedOrder } from "./orders.validation";
import { PoolClient } from "pg";
import { DatabaseService } from "interfaces/database.interface";

export class OrderRepository {
  constructor(private readonly DB: DatabaseService) {}

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

  public async getPopulatedOrder(orderId: number): Promise<PopulatedOrder | null> {
    const result = await this.DB.query(
      `SELECT 
        o.id as order_id,
        o.created_at as order_created_at,
        o.updated_at as order_updated_at,
        u.id as buyer_id,
        u.username as buyer_username,
        u.email as buyer_email,
        u.password as buyer_password,
        u.stripe_customer_id as buyer_stripe_customer_id,
        u.created_at as buyer_created_at,
        u.updated_at as buyer_updated_at,
        od.id as detail_id,
        od.quantity,
        od.total_price_in_cents,
        p.id as product_id,
        p.owner_id as product_owner_id,
        p.name as product_name,
        p.description as product_description,
        p.image_url as product_image_url,
        p.price_in_cents as product_price_in_cents,
        p.created_at as product_created_at,
        p.updated_at as product_updated_at
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      LEFT JOIN order_details od ON o.id = od.order_id
      LEFT JOIN products p ON od.product_id = p.id
      WHERE o.id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Transform flat result into nested structure
    const orderDetails: OrderDetail[] = result.rows
      .filter((row) => row.detail_id !== null) // Filter out rows without order details
      .map(
        (row): OrderDetail => ({
          id: row.detail_id,
          quantity: row.quantity,
          total_price_in_cents: row.total_price_in_cents,
          product: {
            id: row.product_id,
            owner_id: row.product_owner_id,
            name: row.product_name,
            description: row.product_description,
            image_url: row.product_image_url,
            price_in_cents: row.product_price_in_cents,
            created_at: row.product_created_at,
            updated_at: row.product_updated_at
          }
        })
      );

    return {
      id: result.rows[0].order_id,
      buyer: {
        id: result.rows[0].buyer_id,
        username: result.rows[0].buyer_username,
        email: result.rows[0].buyer_email,
        password: result.rows[0].buyer_password,
        stripe_customer_id: result.rows[0].buyer_stripe_customer_id,
        created_at: result.rows[0].buyer_created_at,
        updated_at: result.rows[0].buyer_updated_at
      },
      order_details: orderDetails,
      created_at: result.rows[0].order_created_at,
      updated_at: result.rows[0].order_updated_at
    };
  }
}
