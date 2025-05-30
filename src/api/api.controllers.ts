import { Router } from "express";

export abstract class Controller {
  public router: Router;

  constructor(protected path: string) {
    this.router = Router();
  }

  protected abstract initializeRoutes(): void;
}
