import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

export class EmbeddingService {
  private static instance: EmbeddingService;

  private constructor() {}

  public static getInstance() {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  private generateChunks(text: string) {
    return text
      .trim()
      .split(".")
      .map((i) => i.trim())
      .filter((i) => i !== "");
  }

  public async generateEmbeddings(value: string) {
    try {
      const { embeddings } = await embedMany({
        model: openai.embedding("text-embedding-ada-002"),
        values: this.generateChunks(value)
      });
      return embeddings;
    } catch (error) {
      console.log({ error });
      return [];
    }
  }
}
