import { HttpController } from "api/api.controllers";
import asyncMiddleware from "middleware/async.middleware";
import { PaymentsService } from "interfaces/payments.interface";
import { BadRequestError } from "api/api.errors";
import { OrderService } from "orders/orders.service";
import { processOrderSchema } from "./payments.validation";

export class PaymentsHttpController extends HttpController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly orderService: OrderService
  ) {
    super("/payments");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(`${this.path}/orders`, this.processOrder);
  }

  private processOrder = asyncMiddleware(async (request, response) => {
    const sig = request.headers["stripe-signature"];
    if (!sig) {
      throw new BadRequestError("Stripe signature is required");
    }
    const rawEvent = this.paymentsService.constructEvent(request.body, sig as string);

    if (
      rawEvent.type === "checkout.session.completed" ||
      rawEvent.type === "checkout.session.async_payment_succeeded"
    ) {
      const event = processOrderSchema.parse(rawEvent);
      this.orderService.confirmOrder(
        event.data.object.metadata.order_id,
        event.data.object.customer_details.email
      );
    }
    response.status(200).end();
  });
}
