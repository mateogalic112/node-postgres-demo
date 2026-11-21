import { loginSchema, registerSchema } from "./auth.validation";
import authMiddleware from "middleware/auth.middleware";
import asyncMiddleware from "middleware/async.middleware";
import { userSchema } from "users/users.validation";
import { HttpController } from "api/api.controllers";
import { formatResponse } from "api/api.formats";
import { BadRequestError } from "api/api.errors";
import { UsersRepository } from "users/users.repository";
import { Auth } from "./auth.model";

export class AuthHttpController extends HttpController {
  constructor(private readonly usersRepository: UsersRepository) {
    super("/auth");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(`${this.path}/register`, this.registerUser);
    this.router.post(`${this.path}/login`, this.loginUser);
    this.router.get(`${this.path}/me`, authMiddleware(this.usersRepository), this.me);
    this.router.delete(
      `${this.path}/logout`,
      authMiddleware(this.usersRepository),
      this.logoutUser
    );
  }

  private registerUser = asyncMiddleware(async (request, response) => {
    const payload = registerSchema.parse(request.body);
    const credentials = await Auth.getRegisterCredentials(payload);
    const createdUser = await this.usersRepository.createUser(credentials);
    response
      .cookie(...Auth.attachCookieParams(createdUser.id))
      .status(201)
      .json(formatResponse(createdUser));
  });

  private loginUser = asyncMiddleware(async (request, response) => {
    const payload = loginSchema.parse(request.body);
    const found = await this.usersRepository.findUserByEmail(payload.email);
    if (!found) {
      throw new BadRequestError("Invalid credentials");
    }
    const validCredentials = await Auth.validatePassword(payload.password, found.password);
    if (!validCredentials) {
      throw new BadRequestError("Invalid credentials");
    }
    response.cookie(...Auth.attachCookieParams(found.id)).json(formatResponse(found));
  });

  private me = asyncMiddleware(async (_, response) => {
    const currentUser = userSchema.safeParse(response.locals.user);
    response.json(formatResponse(currentUser));
  });

  private logoutUser = asyncMiddleware(async (_, response) => {
    response
      .setHeader(...Auth.clearCookieParams())
      .status(204)
      .end();
  });
}
