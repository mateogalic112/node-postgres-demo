import { DatabaseService } from "interfaces/database.interface";
import { Role } from "./roles.validation";

export class RolesRepository {
  constructor(private readonly DB: DatabaseService) {}

  public async hasAccessPermissions(
    userId: number,
    allowedRoles: Array<Role["name"]>
  ): Promise<boolean> {
    const result = await this.DB.query(
      `SELECT COUNT(*) as count
       FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND r.name IN (${allowedRoles.map((_, index) => `$${index + 2}`).join(", ")})`,
      [userId, ...allowedRoles]
    );

    return parseInt(result.rows[0].count) > 0;
  }

  public async assignRoleToUser(userId: number, roleId: number): Promise<void> {
    await this.DB.query(
      `INSERT INTO user_roles (user_id, role_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, roleId]
    );
  }

  public async removeRoleFromUser(userId: number, roleId: number): Promise<void> {
    await this.DB.query(
      `DELETE FROM user_roles 
       WHERE user_id = $1 AND role_id = $2`,
      [userId, roleId]
    );
  }
}
