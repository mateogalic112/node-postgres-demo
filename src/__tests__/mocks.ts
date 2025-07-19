import { DatabaseService } from "interfaces/database.interface";
import { FilesService } from "interfaces/files.interface";
import { MailService } from "interfaces/mail.interface";
import { Client, PoolClient } from "pg";

export const mailService: MailService = {
  sendEmail: jest.fn().mockResolvedValue("123e4567-e89b-12d3-a456-426614174000")
};

export const filesService: FilesService = {
  uploadFile: jest.fn().mockResolvedValue("https://example.com/image.jpg")
};

export const createMockDatabaseService = (client: Client): DatabaseService => {
  return {
    query: client.query.bind(client),
    getClient: async () =>
      ({
        ...client,
        query: client.query.bind(client),
        release: client.end
      }) as unknown as PoolClient
  };
};
