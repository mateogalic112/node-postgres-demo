import { Request } from "express";
import validationMiddleware from "middleware/validation.middleware";
import { loginSchema, registerSchema } from "./auth.validation";
import { AuthService } from "./auth.service";
import { Controller } from "interfaces/controller.interface";
import authMiddleware from "middleware/auth.middleware";
import { AuthRepository } from "./auth.repository";

export class AuthController extends Controller {
  private authService = new AuthService(new AuthRepository());

  constructor() {
    super("/auth");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(
      `${this.path}/register`,
      validationMiddleware(registerSchema),
      async (request, response) => {
        const createdUser = await this.authService.registerUser(request.body);
        response
          .cookie(
            "Authentication",
            this.authService.createToken(createdUser.id),
            this.authService.createCookieOptions()
          )
          .status(201)
          .json(createdUser);
      }
    );
    this.router.post(
      `${this.path}/login`,
      validationMiddleware(loginSchema),
      async (request, response) => {
        const user = await this.authService.login(request.body);
        response
          .cookie(
            "Authentication",
            this.authService.createToken(user.id),
            this.authService.createCookieOptions()
          )
          .json(user);
      }
    );
    this.router.get(`${this.path}/me`, authMiddleware, async (request: Request, response) => {
      const loggedUser = await this.authService.isLoggedIn(request.userId);
      response.json(loggedUser);
    });
    this.router.delete(`${this.path}/logout`, authMiddleware, async (_, response) => {
      response
        .setHeader("Set-Cookie", ["Authentication=; Max-Age=0; Path=/; HttpOnly"])
        .status(204)
        .end();
    });
  }
}
