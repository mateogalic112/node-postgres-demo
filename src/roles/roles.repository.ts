import { DatabaseService } from "interfaces/database.interface";
import { Role } from "./roles.validation";

export class RolesRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async hasAccessPermissions(userId: number, allowedRoles: Array<Role["name"]>) {
    const result = await this.DB.query(
      `SELECT COUNT(*) as count
       FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND r.name IN (${allowedRoles.map((_, index) => `$${index + 2}`).join(", ")})`,
      [userId, ...allowedRoles]
    );

    return parseInt(result.rows[0].count) > 0;
  }
}
