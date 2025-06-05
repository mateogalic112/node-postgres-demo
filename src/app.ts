import express from "express";
import cors from "cors";
import { env } from "config/env";
import errorMiddleware from "middleware/error.middleware";
import { type Controller } from "api/api.controllers";
import cookieParser from "cookie-parser";
import loggerMiddleware from "middleware/logger.middleware";
import { Server as SocketServer } from "socket.io";
import { createServer, Server } from "http";

class App {
  private app: express.Application;
  private server: Server;
  private io: SocketServer;

  constructor(controllers: Controller[]) {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: env.FRONTEND_URL,
        credentials: true
      }
    });

    this.initializeMiddlewares();
    this.initializeControllers(controllers);

    this.app.use(errorMiddleware);
  }

  private initializeMiddlewares() {
    this.app.use(express.json());
    this.app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
    this.app.use(cookieParser());
    this.app.use(loggerMiddleware);
  }

  private initializeControllers(controllers: Controller[]) {
    controllers.forEach((controller) => {
      this.app.use("/api/v1", controller.router);
    });
  }

  public getServer() {
    return this.server;
  }

  public listen() {
    this.server.listen(env.PORT, () => {
      console.log(`App listening on the port ${env.PORT}`);
    });

    this.io.on("connection", (socket) => {
      console.log(`User connected: ${socket.id}`);
      socket.on("disconnect", () => {
        console.log("user disconnected");
      });
    });
  }
}

export default App;
