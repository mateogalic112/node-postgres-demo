import { HttpError } from "errors/http.error";
import type { ErrorRequestHandler } from "express";
import { LoggerService } from "services/logger.service";
import { ZodError } from "zod";

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

const getErrorStatus = (error: ZodError | HttpError): number => {
  if (error instanceof ZodError) return 400;
  if (error instanceof HttpError) return error.status;
  return 500;
};

const getErrorMessage = (error: ZodError | HttpError): string => {
  if (error instanceof ZodError) return error.errors.map((e) => e.message).join(", ");
  if (error instanceof HttpError) return error.message;
  return "Something went wrong";
};

export default errorMiddleware;
