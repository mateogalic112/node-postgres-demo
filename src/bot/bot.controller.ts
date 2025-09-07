import { openai } from "@ai-sdk/openai";
import { ModelMessage, stepCountIs, streamText, tool } from "ai";
import { HttpController } from "api/api.controllers";
import asyncMiddleware from "middleware/async.middleware";
import { ProductService } from "products/products.service";
import z from "zod";

const messages: ModelMessage[] = [];

export class BotHttpController extends HttpController {
  constructor(private readonly productsService: ProductService) {
    super("/chat");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(`${this.path}`, this.sendMessage);
  }

  private sendMessage = asyncMiddleware(async (request, response) => {
    const { message } = request.body;
    messages.push({ role: "user", content: message });

    const result = streamText({
      model: openai("gpt-4o"),
      messages,
      stopWhen: stepCountIs(5),
      tools: {
        get_products: tool({
          description:
            "Access to all products in the platform. Use bigger limits to get more products.",
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
          description: "Recommend a product for the user from the products in the platform.",
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
      }
    });

    result.pipeUIMessageStreamToResponse(response);
  });
}
