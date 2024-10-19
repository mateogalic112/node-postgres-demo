import pool from "config/database";
import { RegisterPayload } from "./auth.validation";
import { User } from "users/users.model";

export class AuthRepository {
  public async createUser(payload: RegisterPayload) {
    const createUserQuery =
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *";

    const result = await pool.query<User>(createUserQuery, [
      payload.username,
      payload.email,
      payload.password,
    ]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  public async findUserById(id: number) {
    const result = await pool.query<User>("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  public async findUserByEmail(email: string) {
    const result = await pool.query<User>(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }
}
