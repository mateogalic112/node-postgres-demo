import { DatabaseService } from "interfaces/database.interface";
import { userSchema } from "./users.validation";
import { RegisterPayload } from "auth/auth.validation";
import { PaginatedRequestParams } from "api/api.validations";
import { RoleName } from "roles/roles.validation";

export class UsersRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async getUsers(params: PaginatedRequestParams) {
    const result = await this.DB.query(
      "SELECT * FROM users WHERE id > $1 ORDER BY id ASC LIMIT $2",
      [params.cursor ?? 0, params.limit]
    );
    return result.rows.map((user) => userSchema.parse(user));
  }

  public async findUserById(id: number) {
    const result = await this.DB.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return null;
    }
    return userSchema.parse(result.rows[0]);
  }

  public async findUserByEmail(email: string) {
    const result = await this.DB.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rowCount === 0) {
      return null;
    }
    return userSchema.parse(result.rows[0]);
  }

  public async createUser(payload: RegisterPayload) {
    const result = await this.DB.query(
      `INSERT INTO users (username, email, password, role_id)
   VALUES ($1, $2, $3, (SELECT id FROM roles WHERE name = $4))
   RETURNING *`,
      [payload.username, payload.email, payload.password, RoleName.USER]
    );
    return userSchema.parse(result.rows[0]);
  }
}
