import { openai } from "@ai-sdk/openai";
import { stepCountIs, streamText, tool, convertToModelMessages } from "ai";
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
    const { messages } = request.body;

    const result = streamText({
      model: openai("gpt-4o"),
      messages: convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      system: `You are a helpful assistant that can recommend products to the user. Before giving a recommendation, 
        you must ask the user if they want to see the products. When returning product options, you must return maximum of 3 products.`,
      tools: {
        get_products: tool({
          description:
            "Access to all products in the platform. Use bigger limits to get more products like 100 or more.",
          inputSchema: z.object({
            limit: z.number().describe("The limit of products to get"),
            cursor: z.number().describe("The cursor to get the next products")
          }),
          execute: async ({ limit, cursor }) => {
            const products = await this.productsService.getProducts({ limit, cursor });
            return {
              products
            };
          }
        }),
        recommend_product: tool({
          description:
            "Recommend a product for the user from the products in the platform. Recommend only 1 product.",
          inputSchema: z.object({
            productId: z.number().describe("The product id to recommend")
          }),
          execute: async ({ productId }) => {
            const product = await this.productsService.getProductById(productId);
            return {
              product
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
