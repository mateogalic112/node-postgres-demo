import { UsersRepository } from "./users.repository";
import { User, userCustomerSchema } from "./users.validation";
import { InternalServerError } from "api/api.errors";
import { PaymentsService } from "interfaces/payments.interface";

export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly paymentsService: PaymentsService
  ) {}

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
