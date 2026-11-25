import { createApp } from "app.factory";
import { EventBus } from "events/events.bus";
import { AWSService } from "services/aws.service";
import { WinstonService } from "services/winston.service";
import { OpenAIService } from "services/openai";
import { PostgresService } from "services/postgres.service";
import { ResendService } from "services/resend.service";
import { StripeService } from "services/stripe.service";

const db = PostgresService.getInstance();
const logger = WinstonService.getInstance();

const app = createApp({
  db,
  logger,
  eventBus: new EventBus(logger),
  filesService: new AWSService(logger),
  embeddingsService: new OpenAIService(logger),
  mailService: new ResendService(logger),
  paymentsService: new StripeService(logger)
});

app.listen();
