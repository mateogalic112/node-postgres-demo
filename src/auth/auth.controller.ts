import { loginSchema, registerSchema } from "./auth.validation";
import { AuthService } from "./auth.service";
import authMiddleware from "middleware/auth.middleware";
import asyncMiddleware from "middleware/async.middleware";
import { AUTH_COOKIE_NAME } from "./auth.constants";
import { userSchema } from "users/users.validation";
import { HttpController } from "api/api.controllers";
import { formatResponse } from "api/api.formats";

export class AuthHttpController extends HttpController {
  constructor(private readonly authService: AuthService) {
    super("/auth");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(`${this.path}/register`, this.registerUser);
    this.router.post(`${this.path}/login`, this.loginUser);
    this.router.get(`${this.path}/me`, authMiddleware(this.authService), this.me);
    this.router.delete(`${this.path}/logout`, authMiddleware(this.authService), this.logoutUser);
  }

  private registerUser = asyncMiddleware(async (request, response) => {
    const createdUser = await this.authService.register(registerSchema.parse(request.body));
    response
      .cookie(
        AUTH_COOKIE_NAME,
        this.authService.createToken(createdUser.id),
        this.authService.createCookieOptions()
      )
      .status(201)
      .json(formatResponse(createdUser));
  });

  private loginUser = asyncMiddleware(async (request, response) => {
    const user = await this.authService.login(loginSchema.parse(request.body));
    response
      .cookie(
        AUTH_COOKIE_NAME,
        this.authService.createToken(user.id),
        this.authService.createCookieOptions()
      )
      .json(formatResponse(user));
  });

  private me = asyncMiddleware(async (_, response) => {
    const loggedUser = await this.authService.isLoggedIn(userSchema.parse(response.locals.user));
    response.json(formatResponse(loggedUser));
  });

  private logoutUser = asyncMiddleware(async (_, response) => {
    response
      .setHeader(`Set-Cookie`, [`${AUTH_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly`])
      .status(204)
      .end();
  });
}
