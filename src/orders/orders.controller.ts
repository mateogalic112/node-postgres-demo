import { HttpController } from "api/api.controllers";
import { AuthService } from "auth/auth.service";
import asyncMiddleware from "middleware/async.middleware";
import authMiddleware from "middleware/auth.middleware";
import { OrderService } from "./orders.service";
import { userSchema } from "users/users.validation";
import { createOrderSchema } from "./orders.validation";
import { formatResponse } from "api/api.formats";
import { PaymentsService } from "interfaces/payments.interface";
import { InternalServerError } from "api/api.errors";

export class OrderHttpController extends HttpController {
  constructor(
    private readonly authService: AuthService,
    private readonly orderService: OrderService,
    private readonly paymentsService: PaymentsService
  ) {
    super("/orders");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(`${this.path}`, authMiddleware(this.authService), this.createOrder);
  }

  private createOrder = asyncMiddleware(async (request, response) => {
    const orderWithOrderDetails = await this.orderService.createOrderWithOrderDetails({
      user: userSchema.parse(response.locals.user),
      payload: createOrderSchema.parse(request.body)
    });
    const checkoutSession = await this.paymentsService.createCheckoutSession(orderWithOrderDetails);
    if (!checkoutSession.url) {
      throw new InternalServerError("Checkout session not created!");
    }
    response.json(formatResponse({ url: checkoutSession.url }));
  });
}
