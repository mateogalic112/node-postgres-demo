import { openai } from "@ai-sdk/openai";
import { stepCountIs, streamText, tool, convertToModelMessages, UIMessage } from "ai";
import { HttpController } from "api/api.controllers";
import asyncMiddleware from "middleware/async.middleware";
import { ProductService } from "products/products.service";
import { LoggerService } from "services/logger.service";
import z from "zod";
import { SYSTEM_PROMPT } from "./bot.prompts";
import authMiddleware from "middleware/auth.middleware";
import { AuthService } from "auth/auth.service";
import { OrderService } from "orders/orders.service";

export class BotHttpController extends HttpController {
  constructor(
    private readonly authService: AuthService,
    private readonly productsService: ProductService,
    private readonly ordersService: OrderService,
    private readonly logger: LoggerService
  ) {
    super("/chat");
    this.initializeRoutes();
  }

  protected initializeRoutes() {
    this.router.post(`${this.path}`, authMiddleware(this.authService), this.sendMessage);
  }

  private sendMessage = asyncMiddleware(async (request, response) => {
    const { messages }: { messages: UIMessage[] } = request.body;
    const user = response.locals.user;

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
        }),
        create_order: tool({
          description: "Create an order for the user with specified products and quantities.",
          inputSchema: z.object({
            line_items: z.array(
              z.object({
                product_id: z.number().describe("The product ID to order"),
                quantity: z.number().describe("The quantity to order")
              })
            )
          }),
          execute: async ({ line_items }) => {
            try {
              const newOrder = await this.ordersService.createOrder({
                user,
                payload: { line_items }
              });
              return this.ordersService.getPopulatedOrder(newOrder.id);
            } catch (error) {
              this.logger.error(`Failed to create order for user ${user.id}: ${error}`);
              return {
                success: false,
                message: "Failed to create order. Please try again or contact support."
              };
            }
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
