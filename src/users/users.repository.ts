import { DatabaseService } from "interfaces/database.interface";
import { User } from "./users.validation";
import { RegisterPayload } from "auth/auth.validation";
import { PaginatedRequestParams } from "api/api.validations";
import { RolesRepository } from "roles/roles.repository";
import { RoleName } from "roles/roles.validation";
import { InternalServerError } from "api/api.errors";

export class UsersRepository {
  constructor(
    private readonly DB: DatabaseService,
    private readonly rolesRepository: RolesRepository
  ) {}

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
    const role = await this.rolesRepository.findRoleByName(RoleName.USER);
    if (!role) {
      throw new InternalServerError("Role not found");
    }

    const result = await this.DB.query<User>(
      "INSERT INTO users (username, email, password, role_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [payload.username, payload.email, payload.password, role.id]
    );
    return result.rows[0];
  }
}
