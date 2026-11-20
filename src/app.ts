import express from "express";
import cors from "cors";
import { env } from "config/env";
import { createErrorMiddleware } from "middleware/error.middleware";
import { SocketController, type HttpController } from "api/api.controllers";
import cookieParser from "cookie-parser";
import { createLoggerMiddleware } from "middleware/logger.middleware";
import { LoggerService } from "interfaces/logger.interface";
import { Server as SocketServer } from "socket.io";
import { createServer, Server } from "http";
import { restrictFieldsReplacer } from "api/api.rules";

class App {
  private app: express.Application;
  private server: Server;
  private io: SocketServer;

  constructor(
    httpControllers: HttpController[],
    socketControllers: SocketController[],
    private readonly logger: LoggerService
  ) {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: env.FRONTEND_URL,
        credentials: true
      }
    });

    this.initializeMiddlewares();
    this.initializeHealthCheck();
    this.initializeControllers(httpControllers);
    this.initializeSocketHandlers(socketControllers);

    this.app.use(createErrorMiddleware(this.logger));
  }

  private initializeHealthCheck() {
    this.app.get("/api/v1/health", (_req, res) => {
      res.status(200).json({ status: "ok" });
    });
  }

  private initializeMiddlewares() {
    // Stripe verifies webhook signatures against the raw body, so it must be parsed before JSON.
    this.app.use("/api/v1/payments/orders", express.raw({ type: "application/json" }));

    this.app.use(express.json());
    this.app.set("json replacer", restrictFieldsReplacer);

    this.app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
    this.app.use(cookieParser());
    this.app.use(createLoggerMiddleware(this.logger));
  }

  private initializeControllers(controllers: HttpController[]) {
    controllers.forEach((controller) => {
      this.app.use("/api/v1", controller.router);
    });
  }

  private initializeSocketHandlers(controllers: SocketController[]) {
    this.io.on("connection", (socket) => {
      controllers.forEach((controller) => {
        controller.initializeEventHandlers(socket);
      });
    });
  }

  public getServer() {
    return this.server;
  }

  public listen() {
    this.server.listen(env.PORT, () => {
      console.log(`App listening on the port ${env.PORT}`);
    });
  }
}

export default App;
