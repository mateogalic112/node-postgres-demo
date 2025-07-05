import { getErrorMessage, getErrorStatus } from "api/api.errors";
import type { ErrorRequestHandler } from "express";
import { LoggerService } from "services/logger.service";

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

export default errorMiddleware;
