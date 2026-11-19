import type { RequestHandler } from "express";
import { LoggerService } from "interfaces/logger.interface";

const REDACTED_FIELDS = ["password", "token", "secret", "authorization"];

const redactBody = (body: unknown): unknown => {
  if (!body || typeof body !== "object") return body;
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [
      key,
      REDACTED_FIELDS.includes(key.toLowerCase()) ? "[REDACTED]" : value
    ])
  );
};

export const createLoggerMiddleware =
  (logger: LoggerService): RequestHandler =>
  (request, response, next) => {
    const start = process.hrtime();

    logger.log(
      `[START] ${request.method} ${request.url}: ${JSON.stringify(redactBody(request.body))}`
    );

    const finishHandler = () => {
      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      logger.log(
        `[FINISH] ${request.method} ${request.url}: ${response.statusCode} ${duration.toFixed(2)}ms`
      );
    };

    response.on("finish", finishHandler);

    response.on("close", () => {
      response.removeListener("finish", finishHandler);
    });

    next();
  };
