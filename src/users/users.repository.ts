import { DatabaseService } from "interfaces/database.interface";
import { User } from "./users.validation";
import { RegisterPayload } from "auth/auth.validation";
import { InternalServerError } from "api/api.errors";

export class UsersRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async findUserById(id: number) {
    const result = await this.DB.query<User>("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rowCount === 0) return null;

    return result.rows[0];
  }

  public async findUserByEmail(email: string) {
    const result = await this.DB.query<User>("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rowCount === 0) return null;

    return result.rows[0];
  }

  public async createUser(payload: RegisterPayload) {
    const result = await this.DB.query<User>(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
      [payload.username, payload.email, payload.password]
    );
    if (result.rowCount === 0) throw new InternalServerError("Failed to create user");

    return result.rows[0];
  }
}
