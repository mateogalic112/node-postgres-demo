import { loginSchema, registerSchema } from "./auth.validation";
import { AuthService } from "./auth.service";
import authMiddleware from "middleware/auth.middleware";
import asyncMiddleware from "middleware/async.middleware";
import { AUTH_COOKIE_NAME } from "./auth.constants";
import { userSchema } from "users/users.validation";
import { Controller } from "api/api.controllers";
import { Database } from "api/api.database";

export class AuthController extends Controller {
  constructor(
    private readonly db: Database,
    private readonly authService: AuthService
  ) {
    super("/auth");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(`${this.path}/register`, this.registerUser);
    this.router.post(`${this.path}/login`, this.loginUser);
    this.router.get(`${this.path}/me`, authMiddleware(this.db), this.me);
    this.router.delete(`${this.path}/logout`, authMiddleware(this.db), this.logoutUser);
  }

  private registerUser = asyncMiddleware(async (request, response) => {
    const payload = registerSchema.parse(request).body;
    const createdUser = await this.authService.registerUser(payload);
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
    const payload = loginSchema.parse(request).body;
    const user = await this.authService.login(payload);
    response
      .cookie(
        AUTH_COOKIE_NAME,
        this.authService.createToken(user.id),
        this.authService.createCookieOptions()
      )
      .json(user);
  });

  private me = asyncMiddleware(async (_, response) => {
    const parsedUser = userSchema.parse(response.locals.user);
    const loggedUser = await this.authService.isLoggedIn(parsedUser);
    response.json(loggedUser);
  });

  private logoutUser = asyncMiddleware(async (_, response) => {
    response
      .setHeader(`Set-Cookie`, [`${AUTH_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly`])
      .status(204)
      .end();
  });
}
