import { User } from "users/users.validation";
import { RolesRepository } from "./roles.repository";
import { Role } from "./roles.validation";

export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  public async checkAccessPermissions({
    user,
    allowedRoles
  }: {
    user: User;
    allowedRoles: Array<Role["name"]>;
  }) {
    if (allowedRoles.length === 0) {
      return false;
    }
    return this.rolesRepository.hasAccessPermissions(user.id, allowedRoles);
  }
}
