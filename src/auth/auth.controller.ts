import { Request, Response, NextFunction } from "express";
import validationMiddleware from "middleware/validation.middleware";
import { loginSchema, registerSchema } from "./auth.validation";
import { AuthService } from "./auth.service";
import { Controller } from "interfaces/controller.interface";

export class AuthController extends Controller {
  private authService = new AuthService();

  constructor() {
    super("/auth");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(
      `${this.path}/register`,
      validationMiddleware(registerSchema),
      this.register
    );
    this.router.post(
      `${this.path}/login`,
      validationMiddleware(loginSchema),
      this.login
    );
  }

  private register = async (
    request: Request,
    response: Response,
    next: NextFunction
  ) => {
    try {
      const createdUser = await this.authService.registerUser(request.body);
      if (!createdUser) return next();

      response.cookie(
        "Authorization",
        this.authService.createToken(createdUser.id),
        this.authService.cookieOptions()
      );

      response.json(createdUser);
    } catch (error) {
      next(error);
    }
  };

  private login = async (
    request: Request,
    response: Response,
    next: NextFunction
  ) => {
    try {
      const user = await this.authService.login(request.body);
      if (!user) return next();

      response.cookie(
        "Authorization",
        this.authService.createToken(user.id),
        this.authService.cookieOptions()
      );

      response.json(user);
    } catch (error) {
      next(error);
    }
  };
}
