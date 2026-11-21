import { InternalServerError } from "api/api.errors";
import { User } from "users/users.validation";
import { CustomersRepository } from "./customers.repository";
import { PaymentLineItem, PaymentsService } from "interfaces/payments.interface";
import { customerSchema } from "./customers.validation";

export class CustomersService {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly paymentsService: PaymentsService
  ) {}

  private async findOrCreateStripeCustomer(user: User) {
    const customer = await this.customersRepository.findStripeCustomerBy(user.id);
    if (customer) return customer;

    const newCustomer = await this.paymentsService.createCustomer(user);
    if (!newCustomer) {
      throw new InternalServerError("Payment service failed to create new customer!");
    }

    const createdCustomer = await this.customersRepository.attachStripeCustomerId(
      user.id,
      newCustomer.id
    );
    return customerSchema.parse(createdCustomer);
  }

  public async getCheckoutUrl(orderId: number, user: User, lineItems: Array<PaymentLineItem>) {
    const { customer_id } = await this.findOrCreateStripeCustomer(user);
    const checkoutSession = await this.paymentsService.pay({
      orderId,
      customerId: customer_id,
      lineItems
    });
    if (!checkoutSession || checkoutSession.url === null) {
      throw new InternalServerError("Checkout session couldn't be created!");
    }
    return checkoutSession.url;
  }
}
