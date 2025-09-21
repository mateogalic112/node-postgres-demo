import { embed, EmbeddingModel, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { LoggerService } from "./logger.service";
import { EmbeddingService } from "interfaces/embeddings.interface";

export class OpenAIService implements EmbeddingService {
  private static instance: OpenAIService;
  private readonly embeddingModel: EmbeddingModel<string>;

  private constructor() {
    this.embeddingModel = openai.embedding("text-embedding-ada-002");
  }

  public static getInstance() {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  public async generateEmbeddings(value: string) {
    try {
      const { embeddings } = await embedMany({
        model: this.embeddingModel,
        values: this.generateChunks(value)
      });
      return embeddings;
    } catch (error) {
      LoggerService.getInstance().error(String(error));
      return [];
    }
  }

  public async generateEmbedding(value: string) {
    try {
      const input = value.replaceAll("\\n", " ");
      return await embed({
        model: this.embeddingModel,
        value: input
      });
    } catch (error) {
      LoggerService.getInstance().error(String(error));
      return null;
    }
  }

  private generateChunks(text: string) {
    return text
      .trim()
      .split(".")
      .map((i) => i.trim())
      .filter((i) => i !== "");
  }
}
