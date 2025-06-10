import { ProductRepository } from "products/products.repository";
import { AuctionRepository } from "../auctions.repository";
import { DatabaseService } from "interfaces/database.interface";
import { ProductService } from "products/products.service";
import { FilesService } from "interfaces/files.interface";
import { MailService } from "interfaces/mail.interface";
import { Auction } from "auctions/auctions.validation";
import { User } from "users/users.validation";
import { addDays } from "date-fns";

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

export const mockAuction = (user: User) =>
  ({
    id: 1,
    product_id: 1,
    creator_id: user.id,
    is_cancelled: false,
    start_time: addDays(new Date(), 1),
    duration_hours: 24,
    winner_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    starting_price: 100
  }) as Auction;
