import { Request, Response, NextFunction } from "express";
import validationMiddleware from "middleware/validation.middleware";
import { registerSchema } from "./auth.validation";
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
  }

  private register = async (
    request: Request,
    response: Response,
    next: NextFunction
  ) => {
    try {
      const registeredUser = await this.authService.registerUser(request.body);
      if (!registeredUser) {
        return next();
      }

      response.cookie(
        "Authorization",
        this.authService.createToken(registeredUser.id),
        {
          maxAge: 5 * 60 * 60 * 1000, // 5 hours
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        }
      );
      response.json(registeredUser);
    } catch (error) {
      next(error);
    }
  };
}
