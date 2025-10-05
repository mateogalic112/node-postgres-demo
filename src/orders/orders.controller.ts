import { HttpController } from "api/api.controllers";
import { AuthService } from "auth/auth.service";
import asyncMiddleware from "middleware/async.middleware";
import authMiddleware from "middleware/auth.middleware";
import { OrderService } from "./orders.service";
import { userSchema } from "users/users.validation";
import { createOrderSchema } from "./orders.validation";
import { formatResponse } from "api/api.formats";
import { PaymentsService } from "interfaces/payments.interface";
import { BadRequestError } from "api/api.errors";

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
    this.router.post(`${this.path}/confirm-order`, this.confirmOrder);
  }

  private createOrder = asyncMiddleware(async (request, response) => {
    const orderWithOrderDetails = await this.orderService.createOrderWithOrderDetails({
      user: userSchema.parse(response.locals.user),
      payload: createOrderSchema.parse(request.body)
    });
    const paymentLink = await this.orderService.getPaymentLink(
      orderWithOrderDetails.id,
      createOrderSchema.parse(request.body)
    );
    response.status(201).json(formatResponse({ ...orderWithOrderDetails, paymentLink }));
  });

  private confirmOrder = asyncMiddleware(async (request, response) => {
    const sig = request.headers["stripe-signature"];
    if (!sig) {
      throw new BadRequestError("Stripe signature is required");
    }
    const event = await this.paymentsService.constructEvent(request.body, sig as string);
    if (event.type === "checkout.session.completed") {
      await this.orderService.confirmOrder(
        event.data.object.metadata?.order_id as number | undefined,
        event.data.object.customer_details?.email as string | undefined
      );
    }
    response.json(formatResponse(event));
  });
}
