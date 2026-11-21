import { openai } from "@ai-sdk/openai";
import { stepCountIs, streamText, tool, convertToModelMessages, UIMessage } from "ai";
import { HttpController } from "api/api.controllers";
import asyncMiddleware from "middleware/async.middleware";
import { LoggerService } from "interfaces/logger.interface";
import z from "zod";
import { SYSTEM_PROMPT } from "./bot.prompts";
import { ProductsRepository } from "products/products.repository";
import { EmbeddingsService } from "interfaces/embeddings.interface";

export class BotHttpController extends HttpController {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly embeddingsService: EmbeddingsService,
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
          execute: async ({ query }) => {
            const embeddedQuery = await this.embeddingsService.generateEmbedding(query);
            if (!embeddedQuery || !embeddedQuery.embedding) {
              return [];
            }
            const relevantProducts = await this.productsRepository.findRelevantProducts(
              embeddedQuery.embedding,
              3
            );
            return this.productsRepository.findProductsByIds(
              relevantProducts.map((product) => product.product_id)
            );
          }
        }),
        recommend_product: tool({
          description: "Recommend product to the user.",
          inputSchema: z.object({
            productId: z.number().describe("The product id to recommend")
          }),
          execute: async ({ productId }) => this.productsRepository.findProductById(productId)
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
