import { Request, Response, NextFunction } from "express";
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
    this.router.post(`${this.path}/register`, validationMiddleware(registerSchema), this.register);
    this.router.post(`${this.path}/login`, validationMiddleware(loginSchema), this.login);
    this.router.get(`${this.path}/me`, authMiddleware, this.isLoggedIn);
    this.router.delete(`${this.path}/logout`, authMiddleware, this.logout);
  }

  private register = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const createdUser = await this.authService.registerUser(request.body);
      response
        .cookie(
          "Authentication",
          this.authService.createToken(createdUser.id),
          this.authService.createCookieOptions()
        )
        .status(201)
        .json(createdUser);
    } catch (error) {
      next(error);
    }
  };

  private login = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await this.authService.login(request.body);
      response
        .cookie(
          "Authentication",
          this.authService.createToken(user.id),
          this.authService.createCookieOptions()
        )
        .json(user);
    } catch (error) {
      next(error);
    }
  };

  private isLoggedIn = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const loggedUser = await this.authService.isLoggedIn(request.userId);
      response.json(loggedUser);
    } catch (error) {
      next(error);
    }
  };

  private logout = (_: Request, response: Response) => {
    response
      .setHeader("Set-Cookie", ["Authentication=; Max-Age=0; Path=/; HttpOnly"])
      .status(204)
      .end();
  };
}
