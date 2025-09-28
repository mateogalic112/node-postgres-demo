import { RegisterPayload } from "auth/auth.validation";
import { UsersRepository } from "./users.repository";
import { UpdateUserPayload, userSchema } from "./users.validation";
import { PaginatedRequestParams } from "api/api.validations";

export class UserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  public async getUsers(params: PaginatedRequestParams) {
    const users = await this.usersRepository.getUsers(params);
    return users.map((user) => userSchema.parse(user));
  }

  public async findUserById(id: number) {
    const user = await this.usersRepository.findUserById(id);
    if (!user) {
      return null;
    }
    return userSchema.parse(user);
  }

  public async findUserByEmail(email: string) {
    const user = await this.usersRepository.findUserByEmail(email);
    if (!user) {
      return null;
    }
    return userSchema.parse(user);
  }

  public async createUser(payload: RegisterPayload) {
    const user = await this.usersRepository.createUser(payload);
    return userSchema.parse(user);
  }

  public async updateUser(id: number, payload: UpdateUserPayload) {
    const user = await this.usersRepository.updateUser(id, payload);
    return userSchema.parse(user);
  }
}
