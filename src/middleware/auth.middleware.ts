import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "api/api.errors";
import { env } from "config/env";
import { userSchema } from "users/users.validation";
import { UserService } from "users/users.service";

export const authMiddleware =
  (usersService: UserService): RequestHandler =>
  async (request, response, next) => {
    const token = request.cookies.Authentication;
    if (!token) return next(new UnauthorizedError());

    const decoded = jwt.verify(token, env.JWT_SECRET) as { _id: number };
    if (!decoded._id) return next(new UnauthorizedError());

    const user = await usersService.getUserById(decoded._id);
    if (!user) return next(new UnauthorizedError());

    const { success, data: parsedUser } = userSchema.safeParse(user);
    if (!success) {
      return next(new UnauthorizedError());
    }

    response.locals.user = parsedUser;

    next();
  };

export default authMiddleware;
