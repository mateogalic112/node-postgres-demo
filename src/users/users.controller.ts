import { HttpController } from "api/api.controllers";
import { paginatedRequestSchema } from "api/api.validations";
import { AuthService } from "auth/auth.service";
import asyncMiddleware from "middleware/async.middleware";
import authMiddleware from "middleware/auth.middleware";
import { authorizationMiddleware } from "middleware/authorization.middleware";
import { RolesService } from "roles/roles.service";
import { RoleName } from "roles/roles.validation";
import { UserService } from "./users.service";
import { formatPaginatedResponse } from "api/api.formats";

export class UsersHttpController extends HttpController {
  constructor(
    private readonly authService: AuthService,
    private readonly rolesService: RolesService,
    private readonly userService: UserService
  ) {
    super("/users");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(
      `${this.path}`,
      authMiddleware(this.authService),
      authorizationMiddleware(this.rolesService, [RoleName.ADMIN]),
      this.getUsers
    );
  }

  private getUsers = asyncMiddleware(async (request, response) => {
    const query = paginatedRequestSchema.parse(request.query);
    const users = await this.userService.getUsers(query);
    response.json(formatPaginatedResponse(users, query.limit));
  });
}
