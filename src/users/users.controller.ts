import pool from "config/database";
import { Router, NextFunction, Request, Response } from "express";
import Controller from "interfaces/controller.interface";

class UsersController implements Controller {
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
      response.json({ createdUser: result.rows[0] });
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
      response.json({ users: result.rows });
    } catch (err) {
      next(err);
    }
  };
}

export default UsersController;
