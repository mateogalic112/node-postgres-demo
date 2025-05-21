import { createLogger, format, transports } from "winston";

export class LoggerService {
  private static instance: LoggerService;

  private constructor() {}

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public log(message: string) {
    if (process.env.NODE_ENV === "test") return;
    this.logger.info(message);
  }

  public error(message: string) {
    if (process.env.NODE_ENV === "test") return;
    this.logger.error(message);
  }

  private logger = createLogger({
    level: "info",
    format: format.combine(
      format.colorize(),
      format.timestamp(),
      format.printf(({ level, message, timestamp }) => {
        return `[${timestamp}] ${level}: ${message}`;
      })
    ),
    transports: [new transports.Console(), new transports.File({ filename: "logs/app.log" })]
  });
}
