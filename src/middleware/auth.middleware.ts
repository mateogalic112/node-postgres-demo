import type { RequestHandler } from "express";
import { AuthService } from "auth/auth.service";

export const authMiddleware =
  (authService: AuthService): RequestHandler =>
  async (request, response, next) => {
    const token = request.cookies.Authentication;

    response.locals.user = await authService.extractUserFromToken(token);

    next();
  };

export default authMiddleware;
