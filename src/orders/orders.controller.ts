import { HttpController } from "api/api.controllers";
import { AuthService } from "auth/auth.service";
import asyncMiddleware from "middleware/async.middleware";
import authMiddleware from "middleware/auth.middleware";
import { OrdersService } from "./orders.service";
import { userSchema } from "users/users.validation";
import { createOrderSchema } from "./orders.validation";
import { formatResponse } from "api/api.formats";
import { PaymentsService } from "interfaces/payments.interface";
import { InternalServerError } from "api/api.errors";
import { UsersService } from "users/users.service";

export class OrdersHttpController extends HttpController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService
  ) {
    super("/orders");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(`${this.path}`, authMiddleware(this.authService), this.createOrder);
  }

  private createOrder = asyncMiddleware(async (request, response) => {
    const user = userSchema.parse(response.locals.user);
    const payload = createOrderSchema.parse(request.body);
    const order = await this.ordersService.createOrderWithOrderDetails(user, payload);
    const lineItems = await this.ordersService.getPaymentLineItems(order.id);
    const customer = await this.usersService.findOrCreateCustomer(response.locals.user);
    const checkoutSession = await this.paymentsService.createCheckoutSession(
      order.id,
      lineItems,
      customer.customer_id
    );
    if (!checkoutSession) {
      throw new InternalServerError("Checkout session not created!");
    }
    response.status(201).json(formatResponse({ url: checkoutSession.url }));
  });
}
