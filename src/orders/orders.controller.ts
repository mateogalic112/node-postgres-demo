import { HttpController } from "api/api.controllers";
import { AuthService } from "auth/auth.service";
import asyncMiddleware from "middleware/async.middleware";
import authMiddleware from "middleware/auth.middleware";
import { OrderService } from "./orders.service";
import { userSchema } from "users/users.validation";
import { createOrderSchema } from "./orders.validation";
import { formatResponse } from "api/api.formats";

export class OrderHttpController extends HttpController {
  constructor(
    private readonly authService: AuthService,
    private readonly orderService: OrderService
  ) {
    super("/orders");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(`${this.path}`, authMiddleware(this.authService), this.createOrder);
  }

  private createOrder = asyncMiddleware(async (request, response) => {
    const order = await this.orderService.createOrder({
      user: userSchema.parse(response.locals.user),
      payload: createOrderSchema.parse(request.body)
    });
    response.status(201).json(formatResponse(order));
  });
}
