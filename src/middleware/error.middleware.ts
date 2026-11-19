import { getErrorMessage, getErrorStatus } from "api/api.errors";
import type { ErrorRequestHandler } from "express";
import { LoggerService } from "interfaces/logger.interface";

export const createErrorMiddleware =
  (logger: LoggerService): ErrorRequestHandler =>
  (error, _request, response, _next) => {
    const status = getErrorStatus(error);
    const message = getErrorMessage(error);

    logger.error(`[ERROR] ${error.name} ${status}: ${error.message} ${error.stack}`);

    response.status(status).json({
      status,
      message
    });
  };
