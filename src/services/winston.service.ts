import { LoggerService } from "interfaces/logger.interface";
import { createLogger, format, transports } from "winston";

export class WinstonService implements LoggerService {
  private static instance: WinstonService;

  private constructor() {}

  public static getInstance(): WinstonService {
    if (!WinstonService.instance) {
      WinstonService.instance = new WinstonService();
    }
    return WinstonService.instance;
  }

  public log(message: string) {
    this.logger.info(message);
  }

  public error(message: string) {
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
