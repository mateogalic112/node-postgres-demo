import { createApp } from "app.factory";
import { AWSService } from "services/aws.service";
import { LoggerService } from "services/logger.service";
import { OpenAIService } from "services/openai";
import { PostgresService } from "services/postgres.service";
import { ResendService } from "services/resend.service";
import { StripeService } from "services/stripe.service";

const db = PostgresService.getInstance();

const app = createApp({
  db,
  files: AWSService.getInstance(),
  embeddings: OpenAIService.getInstance(),
  mail: ResendService.getInstance(),
  payments: StripeService.getInstance(),
  logger: LoggerService.getInstance()
});

app.listen();
