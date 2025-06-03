import { HttpError } from "api/api.errors";
import type { ErrorRequestHandler } from "express";
import { LoggerService } from "services/logger.service";
import { ZodError } from "zod";
import { MulterError } from "multer";

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error);

  LoggerService.getInstance().error(
    `[ERROR] ${error.name} ${status}: ${error.message} ${error.stack}`
  );

  response.status(status).json({
    status,
    message
  });
};

const getErrorStatus = (error: ZodError | HttpError | MulterError): number => {
  if (error instanceof ZodError) return 400;
  if (error instanceof HttpError) return error.status;
  if (error instanceof MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") return 413;
    return 400;
  }
  return 500;
};

const getErrorMessage = (error: ZodError | HttpError | MulterError): string => {
  if (error instanceof ZodError) return error.errors.map((e) => e.message).join(", ");
  if (error instanceof HttpError) return error.message;
  if (error instanceof MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") return "File size too large";
    return error.message;
  }
  return "Something went wrong";
};

export default errorMiddleware;
