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
      Every time you return information about a product, you must use the recommend_product tool. After calling this tool, explain in one sentence 
      why you have chosen the product based on how user can benefit from it in real life, how can it improve their life. Use pure text, without any markdown, images or links.`,
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
