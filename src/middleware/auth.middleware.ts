import type { RequestHandler } from "express";
import { AuthService } from "auth/auth.service";

export const authMiddleware =
  (authService: AuthService): RequestHandler =>
  async (request, response, next) => {
    response.locals.user = await authService.extractUserFromToken(request.cookies.Authentication);
    next();
  };

export default authMiddleware;
