import { Router } from "express";
import { Socket } from "socket.io";

export abstract class HttpController {
  public router: Router;

  constructor(protected path: string) {
    this.router = Router();
  }

  protected abstract initializeRoutes(): void;
}

export abstract class SocketController {
  constructor() {}

  public abstract initializeEventHandlers(socket: Socket): void;
}
