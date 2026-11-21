import { ForbiddenError } from "api/api.errors";
import type { RequestHandler } from "express";
import { RolesRepository } from "roles/roles.repository";
import { RoleName } from "roles/roles.validation";

export const authorizationMiddleware =
  (rolesRepository: RolesRepository, allowedRoles: Array<RoleName>): RequestHandler =>
  async (_request, response, next) => {
    const user = response.locals.user;
    if (!user) {
      return next(new ForbiddenError());
    }
    const hasAccess = await rolesRepository.hasAccessPermissions(user.id, allowedRoles);
    if (!hasAccess) {
      return next(new ForbiddenError());
    }
    next();
  };
