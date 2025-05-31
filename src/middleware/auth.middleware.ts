import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "api/api.errors";
import { env } from "config/env";
import { userSchema } from "users/users.validation";
import { UsersRepository } from "users/users.repository";

export const authMiddleware =
  (usersRepository: UsersRepository): RequestHandler =>
  async (request, response, next) => {
    const token = request.cookies.Authentication;
    if (!token) return next(new UnauthorizedError());

    const decoded = jwt.verify(token, env.JWT_SECRET) as { _id: number };
    if (!decoded._id) return next(new UnauthorizedError());

    const user = await usersRepository.findUserById(decoded._id);
    if (!user) return next(new UnauthorizedError());

    const { success, data: parsedUser } = userSchema.safeParse(user);
    if (!success) {
      return next(new UnauthorizedError());
    }

    response.locals.user = parsedUser;

    next();
  };

export default authMiddleware;
