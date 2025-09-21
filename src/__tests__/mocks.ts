import { DatabaseService } from "interfaces/database.interface";
import { EmbeddingService } from "interfaces/embeddings.interface";
import { FilesService } from "interfaces/files.interface";
import { MailService } from "interfaces/mail.interface";
import { Client, PoolClient } from "pg";

export const mailService: MailService = {
  sendEmail: jest.fn().mockResolvedValue("123e4567-e89b-12d3-a456-426614174000")
};

export const filesService: FilesService = {
  uploadFile: jest.fn().mockResolvedValue("https://example.com/image.jpg")
};

export const embeddingService: EmbeddingService = {
  generateEmbeddings: jest.fn().mockResolvedValue([1, 2, 3]),
  generateEmbedding: jest
    .fn()
    .mockResolvedValue({ embedding: [1, 2, 3], usage: { promptTokens: 10, totalTokens: 10 } })
};

export const createMockDatabaseService = (client: Client): DatabaseService => {
  return {
    query: client.query.bind(client),
    getClient: async () =>
      ({
        ...client,
        query: client.query.bind(client),
        release: () => {}
      }) as unknown as PoolClient
  };
};
