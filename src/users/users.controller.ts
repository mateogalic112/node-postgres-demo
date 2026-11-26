import { HttpController } from "api/api.controllers";
import { paginatedRequestSchema } from "api/api.validations";
import asyncMiddleware from "middleware/async.middleware";
import authMiddleware from "middleware/auth.middleware";
import { authorizationMiddleware } from "middleware/authorization.middleware";
import { RoleName } from "roles/roles.validation";
import { formatPaginatedResponse } from "api/api.formats";
import { UsersRepository } from "./users.repository";
import { RolesRepository } from "roles/roles.repository";

export class UsersHttpController extends HttpController {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly usersRepository: UsersRepository
  ) {
    super("/users");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(
      `${this.path}`,
      authMiddleware(this.usersRepository),
      authorizationMiddleware(this.rolesRepository, [RoleName.ADMIN]),
      this.getUsers
    );
  }

  private getUsers = asyncMiddleware(async (request, response) => {
    const query = paginatedRequestSchema.parse(request.query);
    const users = await this.usersRepository.getUsers(query);
    response.json(formatPaginatedResponse(users, query.limit));
  });
}
