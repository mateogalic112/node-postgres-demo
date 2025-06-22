import { Router } from "express";
import { Socket } from "socket.io";

export abstract class HttpController {
  public router: Router;

  constructor(protected readonly path: string) {
    this.router = Router();
  }

  protected abstract initializeRoutes(): void;
}

enum SocketEvents {
  ERROR = "ERROR"
}

export abstract class SocketController {
  protected events: Record<SocketEvents, string> = {
    [SocketEvents.ERROR]: `${this.namespace}:${SocketEvents.ERROR}`
  };

  constructor(protected readonly namespace: string) {}

  public abstract initializeEventHandlers(socket: Socket): void;
}
