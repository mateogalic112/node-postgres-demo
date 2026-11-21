import { DatabaseUser } from "users/users.validation";
import { RolesRepository } from "./roles.repository";
import { RoleName } from "./roles.validation";

export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  public async checkAccessPermissions({
    user,
    allowedRoles
  }: {
    user: DatabaseUser;
    allowedRoles: Array<RoleName>;
  }) {
    if (allowedRoles.length === 0) {
      return false;
    }
    return this.rolesRepository.hasAccessPermissions(user.id, allowedRoles);
  }
}
