import { DatabaseService } from "interfaces/database.interface";
import { Customer } from "./customers.validation";

export class CustomersRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async attachStripeCustomerId(userId: number, customerId: string) {
    const result = await this.DB.query<Customer>(
      "INSERT INTO stripe_customers (user_id, customer_id) VALUES ($1, $2) RETURNING *",
      [userId, customerId]
    );
    return result.rows[0];
  }

  public async findStripeCustomerBy(userId: number) {
    const result = await this.DB.query<Customer>(
      "SELECT * FROM stripe_customers WHERE user_id = $1",
      [userId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0];
  }
}
