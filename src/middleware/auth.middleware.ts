import { NextFunction, Response, Request } from "express";
import pool from "config/database";
import { UnauthorizedError } from "errors/unauthorized.error";

async function authMiddleware(
  request: Request,
  _: Response,
  next: NextFunction
) {
  if (!request.userId) return next(new UnauthorizedError());

  const result = await pool.query("SELECT id FROM users WHERE id = $1", [
    request.userId,
  ]);

  if (!result.rowCount) return next(new UnauthorizedError());

  next();
}

export default authMiddleware;
