import { ProductRepository } from "products/products.repository";
import { AuctionRepository } from "../auctions.repository";
import { DatabaseService } from "interfaces/database.interface";
import { ProductService } from "products/products.service";
import { FilesService } from "interfaces/files.interface";
import { MailService } from "interfaces/mail.interface";

jest.mock("../auctions.repository");
jest.mock("../../products/products.service");
jest.mock("../../interfaces/mail.interface");

export const createMockAuctionRepository = (): jest.Mocked<AuctionRepository> =>
  new AuctionRepository({} as DatabaseService) as jest.Mocked<AuctionRepository>;

export const createMockMailService = (): jest.Mocked<MailService> => ({
  sendEmail: jest.fn().mockResolvedValue("mock-email-id")
});

export const createMockProductService = (): jest.Mocked<ProductService> =>
  new ProductService(
    {} as ProductRepository,
    createMockMailService(),
    {} as FilesService
  ) as jest.Mocked<ProductService>;
