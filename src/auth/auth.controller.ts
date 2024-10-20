import { Request, Response, NextFunction } from "express";
import validationMiddleware from "middleware/validation.middleware";
import { loginSchema, registerSchema } from "./auth.validation";
import { AuthService } from "./auth.service";
import { Controller } from "interfaces/controller.interface";
import authMiddleware from "middleware/auth.middleware";

export class AuthController extends Controller {
  private authService = new AuthService();

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
      if (!createdUser) return next("No user created");

      response.cookie(
        "Authentication",
        this.authService.createToken(createdUser.id),
        this.authService.createCookieOptions()
      );

      response.status(201).json(createdUser);
    } catch (error) {
      next(error);
    }
  };

  private login = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await this.authService.login(request.body);
      if (!user) return next("No user found");

      response.cookie(
        "Authentication",
        this.authService.createToken(user.id),
        this.authService.createCookieOptions()
      );

      response.json(user);
    } catch (error) {
      next(error);
    }
  };

  private isLoggedIn = async (request: Request, response: Response, next: NextFunction) => {
    try {
      const loggedUser = await this.authService.isLoggedIn(request.userId);
      if (!loggedUser) return next();

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
