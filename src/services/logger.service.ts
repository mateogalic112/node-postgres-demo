import { createLogger, format, transports } from "winston";

export class LoggerService {
  private static instance: LoggerService;

  private readonly REDACTED_FIELDS = ["password", "token", "secret", "authorization"];

  private constructor() {}

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public redactBody(body: unknown): unknown {
    if (!body || typeof body !== "object") return body;
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      redacted[key] = this.REDACTED_FIELDS.includes(key.toLowerCase()) ? "[REDACTED]" : value;
    }
    return redacted;
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
