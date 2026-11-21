import { UnauthenticatedError } from "api/api.errors";
import { Auth } from "auth/auth.model";
import type { RequestHandler } from "express";
import { UsersRepository } from "users/users.repository";

const authMiddleware =
  (usersRepository: UsersRepository): RequestHandler =>
  async (request, response, next) => {
    const userId = await Auth.extractUserIdFromCookies(request.cookies);
    const user = await usersRepository.findUserById(userId);
    if (!user) {
      throw new UnauthenticatedError("User not found");
    }
    response.locals.user = user;
    next();
  };

export default authMiddleware;
