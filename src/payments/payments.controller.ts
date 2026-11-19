import { HttpController } from "api/api.controllers";
import asyncMiddleware from "middleware/async.middleware";
import { BadRequestError } from "api/api.errors";
import { OrdersService } from "orders/orders.service";
import { processOrderSchema } from "./payments.validation";
import { PaymentsService } from "interfaces/payments.interface";
import { LoggerService } from "interfaces/logger.interface";

export class PaymentsHttpController extends HttpController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService,
    private readonly logger: LoggerService
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
    this.logger.log(`[STRIPE] Webhook received: ${rawEvent.type}`);
    if (
      rawEvent.type === "checkout.session.completed" ||
      rawEvent.type === "checkout.session.async_payment_succeeded"
    ) {
      const event = processOrderSchema.parse(rawEvent);
      await this.ordersService.confirmOrder(event.data.object.metadata.order_id);
    }
    response.status(200).end();
  });
}
