import pool from "config/database";
import { Router, Request, Response, NextFunction } from "express";

class UsersController {
  public path = "/users";
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes() {
    this.router.get(this.path, this.getUsers);
    this.router.post(this.path, this.createUser);
  }

  private createUser = async (
    request: Request,
    response: Response,
    next: NextFunction
  ) => {
    const { username, email } = request.body;
    try {
      const insertUser =
        "INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *";
      const result = await pool.query(insertUser, [username, email]);

      const createdUser = result.rows[0];
      return response.json(createdUser);
    } catch (err) {
      next(err);
    }
  };

  private getUsers = async (
    _: Request,
    response: Response,
    next: NextFunction
  ) => {
    try {
      const result = await pool.query("SELECT id, username, email FROM users");
      const users = result.rows;
      return response.json(users);
    } catch (err) {
      next(err);
    }
  };
}

export default UsersController;
