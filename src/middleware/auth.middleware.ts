import { NextFunction, Response, Request } from "express";
import pool from "config/database";

async function authMiddleware(
  request: Request,
  _: Response,
  next: NextFunction
) {
  if (!request.userId) {
    return next("Unauthorized");
  }

  const result = await pool.query("SELECT id FROM users WHERE id = $1", [
    request.userId,
  ]);

  if (!result.rowCount) {
    return next("Unauthorized");
  }

  next();
}

export default authMiddleware;
