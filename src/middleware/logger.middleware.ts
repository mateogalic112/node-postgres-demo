import { NextFunction, Response, Request } from "express";
import { LoggerService } from "services/logger.service";

async function loggerMiddleware(request: Request, response: Response, next: NextFunction) {
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  const start = process.hrtime();
  const logger = LoggerService.getInstance();

  logger.log(`[START] ${request.method} ${request.url}: ${JSON.stringify(request.body)}`);

  const finishHandler = () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1000000;

    logger.log(
      `[FINISH] ${request.method} ${request.url}: ${response.statusCode} ${duration.toFixed(2)}ms`
    );
  };

  // Add event listeners
  response.on("finish", finishHandler);

  // Clean up event listeners when the response is done
  response.on("close", () => {
    response.removeListener("finish", finishHandler);
  });

  next();
}

export default loggerMiddleware;
