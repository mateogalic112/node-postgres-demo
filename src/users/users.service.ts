import { RegisterPayload } from "auth/auth.validation";
import { UsersRepository } from "./users.repository";
import { User, userCustomerSchema, userSchema } from "./users.validation";
import { InternalServerError } from "api/api.errors";
import { PaymentsService } from "interfaces/payments.interface";

export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly paymentsService: PaymentsService
  ) {}

  public async findUserById(id: number) {
    const result = await this.usersRepository.findUserById(id);
    if (!result) {
      return null;
    }
    return this.toUser(result);
  }

  public async findUserByEmail(email: string) {
    const result = await this.usersRepository.findUserByEmail(email);
    if (!result) {
      return null;
    }
    return this.toUser(result);
  }

  public async createUser(payload: RegisterPayload) {
    const result = await this.usersRepository.createUser(payload);
    return this.toUser(result);
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

  private toUser(data: unknown): User {
    return userSchema.parse(data);
  }
}
