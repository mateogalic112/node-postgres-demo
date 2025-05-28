import type { RequestHandler, Request } from "express";
import pool from "config/database";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "errors/http.error";
import { env } from "config/env";

export const authMiddleware: RequestHandler = async (request: Request, _, next) => {
  const token = request.cookies.Authentication;
  if (!token) return next(new UnauthorizedError());

  const decoded = jwt.verify(token, env.JWT_SECRET) as { _id: number };
  if (!decoded._id) return next(new UnauthorizedError());

  const result = await pool.query("SELECT id FROM users WHERE id = $1", [decoded._id]);
  if (result.rows.length === 0) return next(new UnauthorizedError());

  request.userId = decoded._id;

  next();
};

export default authMiddleware;
