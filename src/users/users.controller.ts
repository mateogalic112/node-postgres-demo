import pool from "database/pool";
import { NextFunction, Request, Response } from "express";
import { Controller } from "api/api.controllers";

class UsersController extends Controller {
  constructor() {
    super("/users");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(this.path, this.getUsers);
  }

  // TODO: For testing purposes only. Remove this in production.
  private getUsers = async (_: Request, response: Response, next: NextFunction) => {
    try {
      const result = await pool.query("SELECT id, username, email FROM users");
      response.json({ users: result.rows });
    } catch (err) {
      next(err);
    }
  };
}

export default UsersController;
