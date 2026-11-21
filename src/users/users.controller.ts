import { HttpController } from "api/api.controllers";
import { paginatedRequestSchema } from "api/api.validations";
import asyncMiddleware from "middleware/async.middleware";
import authMiddleware from "middleware/auth.middleware";
import { authorizationMiddleware } from "middleware/authorization.middleware";
import { RolesService } from "roles/roles.service";
import { RoleName } from "roles/roles.validation";
import { formatPaginatedResponse } from "api/api.formats";
import { UsersRepository } from "./users.repository";
import { userSchema } from "./users.validation";

export class UsersHttpController extends HttpController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly usersRepository: UsersRepository
  ) {
    super("/users");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(
      `${this.path}`,
      authMiddleware(this.usersRepository),
      authorizationMiddleware(this.rolesService, [RoleName.ADMIN]),
      this.getUsers
    );
  }

  private getUsers = asyncMiddleware(async (request, response) => {
    const payload = paginatedRequestSchema.parse(request.query);
    const rawUsers = await this.usersRepository.getUsers(payload);
    const users = rawUsers.map((user) => userSchema.parse(user));
    response.json(formatPaginatedResponse(users, payload.limit));
  });
}
