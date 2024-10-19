import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { LoginPayload, RegisterPayload } from "./auth.validation";
import { AuthRepository } from "./auth.repository";
import { env } from "config/env";
import { BadRequestError } from "errors/bad-request.error";
import { CookieOptions } from "express";
import { User } from "users/users.model";

export class AuthService {
  private authRepository = new AuthRepository();

  public async registerUser(payload: RegisterPayload) {
    // Check if email already exists
    const foundUser = await this.authRepository.findUserByEmail(payload.email);
    if (foundUser) {
      throw new BadRequestError("User with that email already exists");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(payload.password, 10);

    const user = await this.authRepository.createUser({
      ...payload,
      password: hashedPassword,
    });

    return this.removePassword(user);
  }

  public async login(payload: LoginPayload) {
    const user = await this.authRepository.findUserByEmail(payload.email);
    if (!user) {
      throw new BadRequestError("Invalid email or password");
    }

    const isPasswordCorrect = await bcrypt.compare(
      payload.password,
      user.password
    );
    if (!isPasswordCorrect) {
      throw new BadRequestError("Invalid email or password");
    }

    return this.removePassword(user);
  }

  public createToken(userId: number) {
    return jwt.sign({ _id: userId }, env.JWT_SECRET, { expiresIn: 60 * 60 });
  }

  public cookieOptions(): CookieOptions {
    return {
      maxAge: 5 * 60 * 60 * 1000, // 5 hours
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    };
  }

  private removePassword(user: User) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
