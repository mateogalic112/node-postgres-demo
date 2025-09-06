import { ForbiddenError } from "api/api.errors";
import type { RequestHandler } from "express";
import { RolesService } from "roles/roles.service";
import { Role } from "roles/roles.validation";

export const authorizationMiddleware =
  (rolesService: RolesService, allowedRoles: Array<Role["name"]>): RequestHandler =>
  async (_request, response, next) => {
    const user = response.locals.user;

    if (!user) {
      return next(new ForbiddenError());
    }

    if (!(await rolesService.checkAccessPermissions({ user, allowedRoles }))) {
      return next(new ForbiddenError());
    }

    next();
  };
