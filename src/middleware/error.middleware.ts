import type { ErrorRequestHandler } from "express";
import { LoggerService } from "services/logger.service";

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  const status = error.status || 500;
  const message = error.message || "Something went wrong";
  response.status(status).json({
    status,
    message
  });

  LoggerService.getInstance().error(
    `[ERROR] ${error.name} ${status}: ${error.message} ${error.stack}`
  );
};

export default errorMiddleware;
