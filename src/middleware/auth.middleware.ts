import type { RequestHandler, Request } from "express";
import pool from "config/database";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "errors/http.error";
import { env } from "config/env";
import { userSchema } from "users/users.validation";

export const authMiddleware: RequestHandler = async (request: Request, response, next) => {
  const token = request.cookies.Authentication;
  if (!token) return next(new UnauthorizedError());

  const decoded = jwt.verify(token, env.JWT_SECRET) as { _id: number };
  if (!decoded._id) return next(new UnauthorizedError());

  const result = await pool.query("SELECT id FROM users WHERE id = $1", [decoded._id]);
  if (result.rows.length === 0) return next(new UnauthorizedError());

  const { success, data: user } = userSchema.safeParse(result.rows[0]);
  if (!success) {
    return next(new UnauthorizedError());
  }

  response.locals.user = user;

  next();
};

export default authMiddleware;
