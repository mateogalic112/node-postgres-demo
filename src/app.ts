import express from "express";
import cors from "cors";
import { env } from "config/env";
import errorMiddleware from "middleware/error.middleware";
import { SocketController, type HttpController } from "api/api.controllers";
import cookieParser from "cookie-parser";
import loggerMiddleware from "middleware/logger.middleware";
import { Server as SocketServer } from "socket.io";
import { createServer, Server } from "http";

class App {
  private app: express.Application;
  private server: Server;
  private io: SocketServer;

  constructor(httpControllers: HttpController[], socketControllers: SocketController[]) {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: env.FRONTEND_URL,
        credentials: true
      }
    });

    this.initializeMiddlewares();
    this.initializeControllers(httpControllers);
    this.initializeSocketHandlers(socketControllers);

    this.app.use(errorMiddleware);
  }

  private initializeMiddlewares() {
    // Apply raw body parsing for Stripe webhook endpoint before JSON parsing
    this.app.use("/api/v1/orders/confirm-order", express.raw({ type: "application/json" }));

    // Apply JSON parsing to all other routes
    this.app.use(express.json());

    this.app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
    this.app.use(cookieParser());
    this.app.use(loggerMiddleware);
  }

  private initializeControllers(controllers: HttpController[]) {
    controllers.forEach((controller) => {
      this.app.use("/api/v1", controller.router);
    });
  }

  private initializeSocketHandlers(controllers: SocketController[]) {
    this.io.on("connection", (socket) => {
      console.log(`User connected: ${socket.id}`);

      controllers.forEach((controller) => {
        controller.initializeEventHandlers(socket);
      });

      socket.on("disconnect", () => {
        console.log("user disconnected");
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
