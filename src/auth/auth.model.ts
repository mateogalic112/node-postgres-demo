import { UnauthenticatedError } from "api/api.errors";
import bcrypt from "bcrypt";
import { env } from "config/env";
import { CookieOptions } from "express";
import jwt from "jsonwebtoken";
import { Socket } from "socket.io";
import { RegisterPayload } from "./auth.validation";

export class Auth {
  private static readonly TWENTY_FOUR_HOURS_IN_SECONDS = 24 * 60 * 60;

  private static readonly AUTH_COOKIE_NAME = "Authentication";

  private static readonly COOKIE_OPTIONS: CookieOptions = {
    maxAge: this.TWENTY_FOUR_HOURS_IN_SECONDS * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  };

  public static extractUserIdFromSocket(socket: Socket) {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
      throw new UnauthenticatedError("Cookie header not found");
    }
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((c) => c.split("=") as [string, string])
    );
    return this.extractUserIdFromCookies(cookies);
  }

  public static async extractUserIdFromCookies(cookies: Record<string, string>) {
    const token = cookies[this.AUTH_COOKIE_NAME];
    if (!token) {
      throw new UnauthenticatedError("Token not found");
    }
    const decoded = jwt.verify(token, env.JWT_SECRET) as { _id: number };
    if (!decoded._id) {
      throw new UnauthenticatedError("Invalid token");
    }
    return decoded._id;
  }

  public static clearCookieParams(): [string, Array<string>] {
    return ["Set-Cookie", [`${this.AUTH_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly`]];
  }

  public static attachCookieParams(userId: number): [string, string, CookieOptions] {
    return [this.AUTH_COOKIE_NAME, this.createToken(userId), this.COOKIE_OPTIONS];
  }

  private static createToken(userId: number) {
    return jwt.sign({ _id: userId }, env.JWT_SECRET, {
      expiresIn: this.TWENTY_FOUR_HOURS_IN_SECONDS
    });
  }

  public static async getRegisterCredentials(credentials: RegisterPayload) {
    const hashedPassword = await this.hashPassword(credentials.password);
    return { ...credentials, password: hashedPassword };
  }

  private static async hashPassword(raw: string) {
    return await bcrypt.hash(raw, 10);
  }

  public static async validatePassword(provided: string, encrypted: string) {
    return await bcrypt.compare(provided, encrypted);
  }
}
