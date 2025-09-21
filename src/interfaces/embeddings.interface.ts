import { Embedding, EmbedResult } from "ai";

export interface EmbeddingService {
  generateEmbeddings(value: string): Promise<Embedding[]>;
  generateEmbedding(value: string): Promise<EmbedResult<string> | null>;
}
