import { DatabaseService } from "interfaces/database.interface";
import { EmbeddingService } from "interfaces/embeddings.interface";
import { FilesService } from "interfaces/files.interface";
import { MailService } from "interfaces/mail.interface";
import { PaymentsService } from "interfaces/payments.interface";
import { Client, PoolClient } from "pg";

export const mailService: MailService = {
  sendEmail: jest.fn().mockResolvedValue("123e4567-e89b-12d3-a456-426614174000")
};

export const filesService: FilesService = {
  uploadFile: jest.fn().mockResolvedValue("https://example.com/image.jpg")
};

// Create a mock embedding vector with 1536 dimensions
const mockEmbedding = Array.from({ length: 1536 }, (_) => Math.random());

export const embeddingService: EmbeddingService = {
  generateEmbeddings: jest.fn().mockResolvedValue([mockEmbedding]),
  generateEmbedding: jest
    .fn()
    .mockResolvedValue({ embedding: mockEmbedding, usage: { promptTokens: 10, totalTokens: 10 } })
};

export const paymentsService: PaymentsService = {
  createCustomer: jest.fn().mockResolvedValue({ id: "cus_test123" }),
  createCheckoutSession: jest.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test" }),
  constructEvent: jest.fn().mockReturnValue({
    type: "checkout.session.completed",
    data: { object: { id: "cs_test123", metadata: { order_id: "1" } } }
  })
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
