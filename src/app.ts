import express from "express";
import cors from "cors";
import { env } from "config/env";
import errorMiddleware from "middleware/error.middleware";
import { type Controller } from "api/api.controllers";
import cookieParser from "cookie-parser";
import loggerMiddleware from "middleware/logger.middleware";

class App {
  public app: express.Application;

  constructor(controllers: Controller[]) {
    this.app = express();

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

  public listen() {
    this.app.listen(env.PORT, () => {
      console.log(`App listening on the port ${env.PORT}`);
    });
  }
}

export default App;
