import { openai } from "@ai-sdk/openai";
import { stepCountIs, streamText, tool, convertToModelMessages, UIMessage } from "ai";
import { HttpController } from "api/api.controllers";
import asyncMiddleware from "middleware/async.middleware";
import { ProductService } from "products/products.service";
import { LoggerService } from "services/logger.service";
import z from "zod";
import { SYSTEM_PROMPT } from "./bot.prompts";

export class BotHttpController extends HttpController {
  constructor(
    private readonly productsService: ProductService,
    private readonly logger: LoggerService
  ) {
    super("/chat");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(`${this.path}`, this.sendMessage);
  }

  private sendMessage = asyncMiddleware(async (request, response) => {
    const { messages }: { messages: UIMessage[] } = request.body;

    const result = streamText({
      model: openai("gpt-4o"),
      messages: convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      system: SYSTEM_PROMPT,
      tools: {
        find_relevant_products: tool({
          description:
            "Get information from your knowledge base about products to answer questions. Every time explain why you have chosen the products.",
          inputSchema: z.object({
            query: z.string().describe("The query to find relevant products")
          }),
          execute: async ({ query }) => this.productsService.findRelevantProducts(query)
        }),
        recommend_product: tool({
          description: "Recommend product to the user.",
          inputSchema: z.object({
            productId: z.number().describe("The product id to recommend")
          }),
          execute: async ({ productId }) => this.productsService.getProductById(productId)
        })
      },
      onStepFinish: async ({ toolResults }) => {
        if (toolResults.length) {
          this.logger.log(JSON.stringify(toolResults, null, 2));
        }
      }
    });

    result.pipeUIMessageStreamToResponse(response);
  });
}
