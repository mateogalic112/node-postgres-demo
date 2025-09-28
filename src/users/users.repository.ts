import { DatabaseService } from "interfaces/database.interface";
import { UpdateUserPayload, User } from "./users.validation";
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

  public async createUser(payload: RegisterPayload) {
    const result = await this.DB.query<User>(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
      [payload.username, payload.email, payload.password]
    );
    return result.rows[0];
  }

  public async updateUser(id: number, payload: UpdateUserPayload) {
    const result = await this.DB.query<User>(
      "UPDATE users SET stripe_customer_id = $1 WHERE id = $2 RETURNING *",
      [payload.stripe_customer_id, id]
    );
    return result.rows[0];
  }
}
