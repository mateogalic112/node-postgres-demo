import { AuctionRepository } from "./auctions.repository";
import { DatabaseService } from "interfaces/database.interface";
import { AuctionService } from "./auctions.service";
import { ProductService } from "products/products.service";
import { FilesService } from "interfaces/files.interface";
import { ProductRepository } from "products/products.repository";
import { User } from "users/users.validation";
import { addDays } from "date-fns";
import { Product } from "products/products.validation";
import { BadRequestError } from "api/api.errors";
import { Auction } from "./auctions.validation";
import { CreateAuctionTemplate, MailService } from "interfaces/mail.interface";

jest.mock("auctions/auctions.repository");
jest.mock("products/products.service");
jest.mock("interfaces/mail.interface");

describe("AuctionService", () => {
  let auctionService: AuctionService;
  let mockedAuctionRepository: jest.Mocked<AuctionRepository>;
  let mockedProductService: jest.Mocked<ProductService>;
  let mailService: jest.Mocked<MailService>;

  const user = { id: 1 } as User;

  beforeEach(() => {
    mailService = {
      sendEmail: jest.fn().mockResolvedValue("123e4567-e89b-12d3-a456-426614174000")
    };

    mockedAuctionRepository = new AuctionRepository(
      {} as DatabaseService
    ) as jest.Mocked<AuctionRepository>;

    mockedProductService = new ProductService(
      {} as ProductRepository,
      mailService,
      {} as FilesService
    ) as jest.Mocked<ProductService>;

    auctionService = new AuctionService(mockedAuctionRepository, mockedProductService, mailService);
  });

  describe("Create a new auction", () => {
    const payload = {
      product_id: 1,
      start_time: addDays(new Date(), 1),
      duration_hours: 24
    };

    it("should fail if the user is not the owner of the product", async () => {
      mockedProductService.getProductById.mockResolvedValue({
        id: 1,
        owner_id: user.id + 1
      } as Product);

      await expect(
        auctionService.createAuction({
          user,
          payload
        })
      ).rejects.toThrow(new BadRequestError("You are not the owner of this product"));
    });

    it("should fail if the product is already attached to an auction", async () => {
      mockedProductService.getProductById.mockResolvedValue({
        id: 1,
        owner_id: user.id
      } as Product);

      mockedAuctionRepository.getAuctionsByProductId.mockResolvedValue([
        {
          id: 1,
          creator_id: user.id,
          product_id: 1,
          start_time: addDays(new Date(), 1),
          duration_hours: 24,
          is_cancelled: false
        } as Auction
      ]);

      await expect(
        auctionService.createAuction({
          user,
          payload
        })
      ).rejects.toThrow(new BadRequestError("Product already attached to an auction"));
    });

    it("should create a new auction", async () => {
      const product = {
        id: 1,
        owner_id: user.id,
        price: 100
      } as Product;

      mockedProductService.getProductById.mockResolvedValue(product);

      mockedAuctionRepository.getAuctionsByProductId.mockResolvedValue([
        {
          id: 1,
          creator_id: user.id,
          product_id: 1,
          start_time: addDays(new Date(), 1),
          duration_hours: 24,
          is_cancelled: true
        } as Auction
      ]);

      mockedAuctionRepository.createAuction.mockResolvedValue({
        id: 1,
        creator_id: user.id,
        product_id: product.id,
        start_time: payload.start_time,
        duration_hours: payload.duration_hours,
        starting_price: product.price,
        is_cancelled: false,
        winner_id: null,
        created_at: new Date(),
        updated_at: new Date()
      } as Auction);

      const newAuction = await auctionService.createAuction({
        user,
        payload
      });

      expect(mailService.sendEmail).toHaveBeenCalledWith({
        to: user.email,
        template: CreateAuctionTemplate.getTemplate(newAuction, product)
      });
    });
  });
});
