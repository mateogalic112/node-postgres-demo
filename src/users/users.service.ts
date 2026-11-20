import { RegisterPayload } from "auth/auth.validation";
import { UsersRepository } from "./users.repository";
import { User, userCustomerSchema, userSchema } from "./users.validation";
import { PaginatedRequestParams } from "api/api.validations";
import { InternalServerError } from "api/api.errors";
import { PaymentsService } from "interfaces/payments.interface";

export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly paymentsService: PaymentsService
  ) {}

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

  public async findOrCreateCustomer(user: User) {
    const customer = await this.usersRepository.findUserCustomerByUserId(user.id);
    if (customer) {
      return customer;
    }
    const newCustomer = await this.paymentsService.createCustomer(user);
    if (!newCustomer) {
      throw new InternalServerError("Customer not created!");
    }
    const createdCustomer = await this.usersRepository.createUserCustomer(user.id, newCustomer.id);
    return userCustomerSchema.parse(createdCustomer);
  }
}
