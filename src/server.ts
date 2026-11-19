import { createApp } from "app.factory";
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
  files: new AWSService(logger),
  embeddings: new OpenAIService(logger),
  mail: new ResendService(logger),
  payments: new StripeService(logger),
  logger
});

app.listen();
