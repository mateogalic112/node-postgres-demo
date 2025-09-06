import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { LoginPayload, RegisterPayload } from "./auth.validation";
import { env } from "config/env";
import { CookieOptions } from "express";
import { User, userSchema } from "users/users.validation";
import { BadRequestError, UnauthenticatedError } from "api/api.errors";
import { UserService } from "users/users.service";

export class AuthService {
  constructor(private readonly usersService: UserService) {}

  public async register(payload: RegisterPayload) {
    const foundUser = await this.usersService.findUserByEmail(payload.email);
    if (foundUser) {
      throw new BadRequestError("User with that email already exists");
    }

    const user = await this.usersService.createUser({
      ...payload,
      password: await bcrypt.hash(payload.password, 10) // Hash password
    });

    return this.removePassword(user);
  }

  public async login(payload: LoginPayload) {
    const user = await this.usersService.findUserByEmail(payload.email);
    if (!user) throw new BadRequestError("Invalid email or password");

    const isPasswordCorrect = await bcrypt.compare(payload.password, user.password);
    if (!isPasswordCorrect) throw new BadRequestError("Invalid email or password");

    return this.removePassword(user);
  }

  public async isLoggedIn(user?: User) {
    if (!user) {
      throw new UnauthenticatedError("User not logged in");
    }
    return this.removePassword(user);
  }

  public async extractUserFromToken(token: string | undefined) {
    if (!token) throw new UnauthenticatedError("Token not found");

    const decoded = jwt.verify(token, env.JWT_SECRET) as { _id: number };
    if (!decoded._id) throw new UnauthenticatedError("Invalid token");

    const user = await this.usersService.findUserById(decoded._id);
    if (!user) throw new UnauthenticatedError("User not found");

    const { success, data: parsedUser } = userSchema.safeParse(user);
    if (!success) {
      throw new UnauthenticatedError("Invalid user");
    }

    return parsedUser;
  }

  public async extractUserFromCookie(cookieHeader: string | undefined) {
    if (!cookieHeader) throw new UnauthenticatedError("Cookie header not found");

    const token = cookieHeader.split("Authentication=")[1];
    if (!token) throw new UnauthenticatedError("Token not found");

    return this.extractUserFromToken(token);
  }

  public createToken(userId: number) {
    return jwt.sign({ _id: userId }, env.JWT_SECRET, { expiresIn: 60 * 60 * 24 }); // 24 hours
  }

  public createCookieOptions(): CookieOptions {
    return {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
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
