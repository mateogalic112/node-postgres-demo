import { UsersRepository } from "./users.repository";
import { userSchema } from "./users.validation";

export class UserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  public async getUserById(id: number) {
    const user = await this.usersRepository.findUserById(id);
    return userSchema.parse(user);
  }
}
