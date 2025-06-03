import { loginSchema, registerSchema } from "./auth.validation";
import { AuthService } from "./auth.service";
import authMiddleware from "middleware/auth.middleware";
import asyncMiddleware from "middleware/async.middleware";
import { AUTH_COOKIE_NAME } from "./auth.constants";
import { userSchema } from "users/users.validation";
import { Controller } from "api/api.controllers";
import { DatabaseService } from "interfaces/database.interface";
import { UsersRepository } from "users/users.repository";

export class AuthController extends Controller {
  constructor(
    private readonly db: DatabaseService,
    private readonly authService: AuthService
  ) {
    super("/auth");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(`${this.path}/register`, this.registerUser);
    this.router.post(`${this.path}/login`, this.loginUser);
    this.router.get(`${this.path}/me`, authMiddleware(new UsersRepository(this.db)), this.me);
    this.router.delete(
      `${this.path}/logout`,
      authMiddleware(new UsersRepository(this.db)),
      this.logoutUser
    );
  }

  private registerUser = asyncMiddleware(async (request, response) => {
    const createdUser = await this.authService.register(registerSchema.parse(request).body);
    response
      .cookie(
        AUTH_COOKIE_NAME,
        this.authService.createToken(createdUser.id),
        this.authService.createCookieOptions()
      )
      .status(201)
      .json(createdUser);
  });

  private loginUser = asyncMiddleware(async (request, response) => {
    const user = await this.authService.login(loginSchema.parse(request).body);
    response
      .cookie(
        AUTH_COOKIE_NAME,
        this.authService.createToken(user.id),
        this.authService.createCookieOptions()
      )
      .json(user);
  });

  private me = asyncMiddleware(async (_, response) => {
    const loggedUser = await this.authService.isLoggedIn(userSchema.parse(response.locals.user));
    response.json(loggedUser);
  });

  private logoutUser = asyncMiddleware(async (_, response) => {
    response
      .setHeader(`Set-Cookie`, [`${AUTH_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly`])
      .status(204)
      .end();
  });
}
