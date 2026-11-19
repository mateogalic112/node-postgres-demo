import { Embedding, EmbedResult } from "ai";

export interface EmbeddingsService {
  generateEmbeddings(value: string): Promise<Embedding[]>;
  generateEmbedding(value: string): Promise<EmbedResult<string> | null>;
}
