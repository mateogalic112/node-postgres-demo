import { loginSchema, registerSchema } from "./auth.validation";
import { AuthService } from "./auth.service";
import authMiddleware from "middleware/auth.middleware";
import asyncMiddleware from "middleware/async.middleware";
import { AUTH_COOKIE_NAME } from "./auth.constants";
import { userSchema } from "users/users.validation";
import { HttpController } from "api/api.controllers";
import { formatResponse } from "api/api.formats";
import { BadRequestError } from "api/api.errors";
import { UsersRepository } from "users/users.repository";
import { User } from "users/users.model";

export class AuthHttpController extends HttpController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersRepository: UsersRepository
  ) {
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
    const payload = registerSchema.parse(request.body);
    const credentials = await User.getRegisterCredentials(payload);
    const createdUser = await this.usersRepository.createUser(credentials);
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
    const payload = loginSchema.parse(request.body);
    const found = await this.usersRepository.findUserByEmail(payload.email);
    if (!found) throw new BadRequestError("Invalid credentials");

    const user = new User(found.password);
    const validCredentials = await user.validateLoginCredentials(payload);
    if (!validCredentials) throw new BadRequestError("Invalid credentials");

    response
      .cookie(
        AUTH_COOKIE_NAME,
        this.authService.createToken(found.id),
        this.authService.createCookieOptions()
      )
      .json(formatResponse(found));
  });

  private me = asyncMiddleware(async (_, response) => {
    const currentUser = userSchema.safeParse(response.locals.user);
    response.json(formatResponse(currentUser));
  });

  private logoutUser = asyncMiddleware(async (_, response) => {
    response
      .setHeader(`Set-Cookie`, [`${AUTH_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly`])
      .status(204)
      .end();
  });
}
