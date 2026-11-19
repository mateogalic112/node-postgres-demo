import { EmbeddingsService } from "interfaces/embeddings.interface";
import { FilesService } from "interfaces/files.interface";
import { LoggerService } from "interfaces/logger.interface";
import { MailService } from "interfaces/mail.interface";
import { PaymentsService } from "interfaces/payments.interface";

export const mailService: MailService = {
  sendEmail: jest.fn().mockResolvedValue("123e4567-e89b-12d3-a456-426614174000")
};

export const filesService: FilesService = {
  uploadFile: jest.fn().mockResolvedValue("https://example.com/image.jpg")
};

const mockEmbedding = Array.from({ length: 1536 }, (_) => Math.random());

export const embeddingsService: EmbeddingsService = {
  generateEmbeddings: jest.fn().mockResolvedValue([mockEmbedding]),
  generateEmbedding: jest
    .fn()
    .mockResolvedValue({ embedding: mockEmbedding, usage: { promptTokens: 10, totalTokens: 10 } })
};

export const paymentsService: PaymentsService = {
  createCustomer: jest.fn().mockResolvedValue({ id: "cus_test123" }),
  createCheckoutSession: jest.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test" }),
  constructEvent: jest.fn()
};

export const logger: LoggerService = {
  log: jest.fn(),
  error: jest.fn()
};
