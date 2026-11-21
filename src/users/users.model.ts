import { LoginPayload, RegisterPayload } from "auth/auth.validation";
import bcrypt from "bcrypt";

export class User {
  constructor(private readonly encryptedPassword: string) {}

  public static async getRegisterCredentials(credentials: RegisterPayload) {
    const hashedPassword = await this.hashPassword(credentials.password);
    return { ...credentials, password: hashedPassword };
  }

  public async validateLoginCredentials(credentials: LoginPayload) {
    const isValidPassword = await this.validatePassword(credentials.password);
    return isValidPassword;
  }

  private static async hashPassword(raw: string) {
    return await bcrypt.hash(raw, 10);
  }

  private async validatePassword(provided: string) {
    return await bcrypt.compare(provided, this.encryptedPassword);
  }
}
