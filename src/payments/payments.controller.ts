import { HttpController } from "api/api.controllers";
import asyncMiddleware from "middleware/async.middleware";
import { BadRequestError } from "api/api.errors";
import { processOrderSchema, SUPPORTED_EVENTS } from "./payments.validation";
import { PaymentsService } from "interfaces/payments.interface";
import { LoggerService } from "interfaces/logger.interface";
import { OrdersRepository } from "orders/orders.repository";

export class PaymentsHttpController extends HttpController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly ordersRepository: OrdersRepository,
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

    if (SUPPORTED_EVENTS.includes(rawEvent.type)) {
      const event = processOrderSchema.parse(rawEvent);
      await this.ordersRepository.confirmOrder(event.data.object.metadata.order_id);
    }
    response.status(200).end();
  });
}
