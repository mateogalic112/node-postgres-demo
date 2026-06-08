import { Router } from "express";
import { Socket } from "socket.io";

export abstract class HttpController {
  public router: Router;

  constructor(protected readonly path: string) {
    this.router = Router();
  }

  protected abstract initializeRoutes(): void;
}

export abstract class SocketController {
  constructor(protected readonly namespace: string) {}

  public abstract initializeEventHandlers(socket: Socket): void;
}
