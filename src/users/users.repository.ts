import { DatabaseService } from "interfaces/database.interface";
import { User, UserCustomer } from "./users.validation";
import { RegisterPayload } from "auth/auth.validation";
import { PaginatedRequestParams } from "api/api.validations";

export class UsersRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async getUsers(params: PaginatedRequestParams) {
    const result = await this.DB.query<User>(
      "SELECT * FROM users WHERE id > $1 ORDER BY id ASC LIMIT $2",
      [params.cursor ?? 0, params.limit]
    );
    return result.rows;
  }

  public async findUserById(id: number) {
    const result = await this.DB.query<User>("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0];
  }

  public async findUserByEmail(email: string) {
    const result = await this.DB.query<User>("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0];
  }

  public async createUser(payload: RegisterPayload, roleId: number) {
    const result = await this.DB.query<User>(
      "INSERT INTO users (username, email, password, role_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [payload.username, payload.email, payload.password, roleId]
    );
    return result.rows[0];
  }

  public async createUserCustomer(userId: number, customerId: string) {
    const result = await this.DB.query<UserCustomer>(
      "INSERT INTO user_customers (user_id, customer_id) VALUES ($1, $2) RETURNING *",
      [userId, customerId]
    );
    return result.rows[0];
  }

  public async findUserCustomerByUserId(userId: number) {
    const result = await this.DB.query<UserCustomer>(
      "SELECT * FROM user_customers WHERE user_id = $1",
      [userId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0];
  }
}
