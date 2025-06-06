import { RegisterPayload } from "auth/auth.validation";
import { UsersRepository } from "./users.repository";
import { userSchema } from "./users.validation";
import { InternalServerError } from "api/api.errors";

export class UserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  public async getUserById(id: number) {
    const user = await this.usersRepository.findUserById(id);
    if (!user) return null;

    return userSchema.parse(user);
  }

  public async findUserByEmail(email: string) {
    const user = await this.usersRepository.findUserByEmail(email);
    if (!user) return null;

    return userSchema.parse(user);
  }

  public async createUser(payload: RegisterPayload) {
    const user = await this.usersRepository.createUser(payload);
    if (!user) throw new InternalServerError("Failed to create user");

    return userSchema.parse(user);
  }
}
