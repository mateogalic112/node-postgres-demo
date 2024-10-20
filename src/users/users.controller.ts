import pool from "config/database";
import { NextFunction, Request, Response } from "express";
import { Controller } from "interfaces/controller.interface";

class UsersController extends Controller {
  constructor() {
    super("/users");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.get(this.path, this.getUsers);
  }

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
