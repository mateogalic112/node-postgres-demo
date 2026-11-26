import { HttpController } from "api/api.controllers";
import asyncMiddleware from "middleware/async.middleware";
import authMiddleware from "middleware/auth.middleware";
import { userSchema } from "users/users.validation";
import { createOrderSchema } from "./orders.validation";
import { formatResponse } from "api/api.formats";
import { idSchema } from "api/api.validations";
import { OrdersRepository } from "./orders.repository";
import { CustomersService } from "customers/customers.service";
import { UsersRepository } from "users/users.repository";

export class OrdersHttpController extends HttpController {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly customersService: CustomersService
  ) {
    super("/orders");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(`${this.path}`, authMiddleware(this.usersRepository), this.createOrder);
    this.router.post(
      `${this.path}/:id/checkout`,
      authMiddleware(this.usersRepository),
      this.orderCheckout
    );
  }

  private createOrder = asyncMiddleware(async (request, response) => {
    const user = userSchema.parse(response.locals.user);
    const payload = createOrderSchema.parse(request.body);
    const order = await this.ordersRepository.createOrderWithOrderDetails(user.id, payload);
    response.status(201).json(formatResponse(order));
  });

  private orderCheckout = asyncMiddleware(async (request, response) => {
    const { id } = idSchema.parse(request.params);
    const user = userSchema.parse(response.locals.user);
    const lineItems = await this.ordersRepository.getPaymentLineItems(id);
    const checkoutURL = await this.customersService.getCheckoutUrl(id, user, lineItems);
    response.status(201).json(formatResponse({ url: checkoutURL }));
  });
}
