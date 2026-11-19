import { embed, EmbeddingModel, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { LoggerService } from "interfaces/logger.interface";
import { EmbeddingsService } from "interfaces/embeddings.interface";

export class OpenAIService implements EmbeddingsService {
  private readonly embeddingModel: EmbeddingModel<string>;

  constructor(private readonly logger: LoggerService) {
    this.embeddingModel = openai.embedding("text-embedding-ada-002");
  }

  public async generateEmbeddings(value: string) {
    try {
      const { embeddings } = await embedMany({
        model: this.embeddingModel,
        values: this.generateChunks(value)
      });
      return embeddings;
    } catch (error) {
      this.logger.error(String(error));
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
      this.logger.error(String(error));
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
