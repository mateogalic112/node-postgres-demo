import { TokenExpiredError } from "jsonwebtoken";
import { MulterError } from "multer";
import { DatabaseError } from "pg";
import { ZodError } from "zod";

export abstract class HttpError extends Error {
  status: number;
  message: string;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.message = message;
  }
}

export class BadRequestError extends HttpError {
  constructor(message?: string) {
    super(400, message || "Bad Request");
  }
}

export class UnauthenticatedError extends HttpError {
  constructor(message?: string) {
    super(401, message || "Unauthenticated");
  }
}

export class ForbiddenError extends HttpError {
  constructor(message?: string) {
    super(403, message || "Lacking access");
  }
}

export class NotFoundError extends HttpError {
  constructor(message?: string) {
    super(404, message || "Not Found");
  }
}

export class InternalServerError extends HttpError {
  constructor(message?: string) {
    super(500, message || "Internal Server Error");
  }
}

export const getErrorStatus = (error: unknown): number => {
  if (error instanceof TokenExpiredError) return 401;
  if (error instanceof ZodError) return 400;
  if (error instanceof HttpError) return error.status;
  if (error instanceof DatabaseError) return 400;
  if (error instanceof MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") return 413;
    return 400;
  }
  return 500;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof TokenExpiredError) return error.message;
  if (error instanceof ZodError) return error.errors.map((e) => e.message).join(", ");
  if (error instanceof HttpError) return error.message;
  if (error instanceof DatabaseError) return error.detail || error.message;
  if (error instanceof MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") return "File size too large";
    return error.message;
  }
  return "Something went wrong";
};
