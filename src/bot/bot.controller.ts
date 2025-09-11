import { openai } from "@ai-sdk/openai";
import { stepCountIs, streamText, tool, convertToModelMessages, UIMessage } from "ai";
import { HttpController } from "api/api.controllers";
import asyncMiddleware from "middleware/async.middleware";
import { ProductService } from "products/products.service";
import { LoggerService } from "services/logger.service";
import z from "zod";

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
      system: `You are a helpful assistant that can recommend products to the user. Check your knowledge base before answering any questions. 
      Only respond to questions using information from tool calls. When returning products, you must return maximum of 3.
      If no relevant information is found in the tool calls, respond, "Sorry, I don't know, try to use website filters."`,
      tools: {
        find_relevant_products: tool({
          description:
            "Get information from your knowledge base about products to answer questions.",
          inputSchema: z.object({
            query: z.string().describe("The query to find relevant products")
          }),
          execute: async ({ query }) => {
            const products = await this.productsService.findRelevantProducts(query);
            return {
              products
            };
          }
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
