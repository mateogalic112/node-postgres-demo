import pool from 'config/database';
import { RegisterPayload } from './auth.validation';
import { User } from 'users/users.model';

export class AuthRepository {
  public async createUser(payload: RegisterPayload) {
    const result = await pool.query<User>(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [payload.username, payload.email, payload.password],
    );
    return result.rows[0];
  }

  public async findUserById(id: number) {
    const result = await pool.query<User>('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  public async findUserByEmail(email: string) {
    const result = await pool.query<User>('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }
}
