import { RoleName } from "../roles/roles.validation";

export const TEST_ADMIN_USER = {
  username: "admin",
  email: "admin@example.com",
  password: "password"
};

export const TEST_ROLES = new Map<RoleName, string>([
  [RoleName.ADMIN, "Admin role"],
  [RoleName.USER, "User role"]
]);
