import { DatabaseService } from "interfaces/database.interface";
import { Role, RoleName } from "./roles.validation";

export class RolesRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async findRoleByName(name: RoleName) {
    const result = await this.DB.query<Role>("SELECT * FROM roles WHERE name = $1", [name]);
    if (result.rowCount === 0) {
      return null;
    }
    return result.rows[0];
  }

  public async hasAccessPermissions(userId: number, allowedRoles: Array<RoleName>) {
    const result = await this.DB.query<Role>(
      `SELECT *
       FROM roles r
       INNER JOIN users u ON r.id = u.role_id
       WHERE u.id = $1 AND r.name IN (${allowedRoles.map((_, index) => `$${index + 2}`).join(", ")})`,
      [userId, ...allowedRoles]
    );

    return result.rows.length > 0;
  }
}
