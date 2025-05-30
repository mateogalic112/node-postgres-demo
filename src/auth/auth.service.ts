import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { LoginPayload, RegisterPayload } from "./auth.validation";
import { AuthRepository } from "./auth.repository";
import { env } from "config/env";
import { CookieOptions } from "express";
import { User, userSchema } from "users/users.validation";
import { BadRequestError, UnauthorizedError } from "api/api.errors";

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  public async registerUser(payload: RegisterPayload) {
    const foundUser = await this.authRepository.findUserByEmail(payload.email);
    if (foundUser) throw new BadRequestError("User with that email already exists");

    const user = await this.authRepository.createUser({
      ...payload,
      password: await bcrypt.hash(payload.password, 10) // Hash password
    });

    const parsedUser = userSchema.parse(user);

    return this.removePassword(parsedUser);
  }

  public async login(payload: LoginPayload) {
    const user = await this.authRepository.findUserByEmail(payload.email);
    if (!user) throw new BadRequestError("Invalid email or password");

    const isPasswordCorrect = await bcrypt.compare(payload.password, user.password);
    if (!isPasswordCorrect) throw new BadRequestError("Invalid email or password");

    const parsedUser = userSchema.parse(user);

    return this.removePassword(parsedUser);
  }

  public async isLoggedIn(user?: User) {
    if (!user) {
      throw new UnauthorizedError("User not logged in");
    }
    return this.removePassword(user);
  }

  public createToken(userId: number) {
    return jwt.sign({ _id: userId }, env.JWT_SECRET, { expiresIn: 60 * 60 });
  }

  public createCookieOptions(): CookieOptions {
    return {
      maxAge: 5 * 60 * 60 * 1000, // 5 hours
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    };
  }

  private removePassword(user: User) {
    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
