import { HttpController } from "api/api.controllers";
import { AuthService } from "auth/auth.service";
import asyncMiddleware from "middleware/async.middleware";
import authMiddleware from "middleware/auth.middleware";
import { userSchema } from "users/users.validation";
import { createOrderSchema, orderWithOrderDetailsSchema } from "./orders.validation";
import { formatResponse } from "api/api.formats";
import { idSchema } from "api/api.validations";
import { OrdersRepository } from "./orders.repository";
import { CustomersService } from "customers/customers.service";

export class OrdersHttpController extends HttpController {
  constructor(
    private readonly authService: AuthService,
    private readonly ordersRepository: OrdersRepository,
    private readonly customersService: CustomersService
  ) {
    super("/orders");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(`${this.path}`, authMiddleware(this.authService), this.createOrder);
    this.router.post(
      `${this.path}/:id/checkout`,
      authMiddleware(this.authService),
      this.orderCheckout
    );
  }

  private createOrder = asyncMiddleware(async (request, response) => {
    const user = userSchema.parse(response.locals.user);
    const payload = createOrderSchema.parse(request.body);
    const rawOrder = await this.ordersRepository.createOrderWithOrderDetails(user, payload);
    const order = orderWithOrderDetailsSchema.parse(rawOrder);
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
