import { TokenExpiredError } from "jsonwebtoken";
import { MulterError } from "multer";
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

export class UnauthorizedError extends HttpError {
  constructor(message?: string) {
    super(401, message || "Unauthorized");
  }
}

export class ForbiddenError extends HttpError {
  constructor(message?: string) {
    super(403, message || "Forbidden");
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

export class PgError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }

  static isPgError(error: unknown): boolean {
    return !!error && typeof error === "object" && "code" in error;
  }

  static isSerializationFailure(error: unknown): boolean {
    return this.isPgError(error) && (error as { code: string }).code === "40001";
  }

  static isDeadlockDetected(error: unknown): boolean {
    return this.isPgError(error) && (error as { code: string }).code === "40P01";
  }

  static isUniqueViolation(error: unknown): boolean {
    return this.isPgError(error) && (error as { code: string }).code === "23505";
  }

  static isViolatingForeignKeyConstraint(error: unknown): boolean {
    return this.isPgError(error) && (error as { code: string }).code === "23503";
  }

  static getErrorStatus(error: unknown) {
    if (!this.isPgError(error)) return null;
    if (this.isSerializationFailure(error)) return 409;
    if (this.isDeadlockDetected(error)) return 409;
    if (this.isUniqueViolation(error)) return 409;
    if (this.isViolatingForeignKeyConstraint(error)) return 404;
    return null;
  }

  static getErrorMessage(error: unknown) {
    if (!this.isPgError(error)) return null;
    if (this.isSerializationFailure(error)) return "Transaction serialization failure";
    if (this.isDeadlockDetected(error)) return "Transaction deadlock detected";
    if (this.isUniqueViolation(error)) return "Unique violation";
    if (this.isViolatingForeignKeyConstraint(error)) return "Violating foreign key constraint";
    return null;
  }
}

export const getErrorStatus = (error: unknown): number => {
  if (error instanceof TokenExpiredError) return 401;
  if (error instanceof ZodError) return 400;
  if (error instanceof HttpError) return error.status;
  if (error instanceof MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") return 413;
    return 400;
  }

  if (error instanceof PgError) return error.status;
  const status = PgError.getErrorStatus(error);
  if (status) return status;

  return 500;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof TokenExpiredError) return error.message;
  if (error instanceof ZodError) return error.errors.map((e) => e.message).join(", ");
  if (error instanceof HttpError) return error.message;
  if (error instanceof MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") return "File size too large";
    return error.message;
  }

  if (error instanceof PgError) return error.message;
  const message = PgError.getErrorMessage(error);
  if (message) return message;

  return "Something went wrong";
};
