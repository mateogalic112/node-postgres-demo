import { AuctionService } from "./auctions.service";
import { User } from "users/users.validation";
import { addDays } from "date-fns";
import { Product } from "products/products.validation";
import { BadRequestError } from "api/api.errors";
import { Auction, CreateAuctionPayload } from "./auctions.validation";
import { CreateAuctionTemplate } from "interfaces/mail.interface";
import {
  createMockAuctionRepository,
  createMockMailService,
  createMockProductService
} from "./mocks/auction.service";

describe("AuctionService", () => {
  const user = { id: 1 } as User;

  const mockedAuctionRepository = createMockAuctionRepository();
  const mockedProductService = createMockProductService();
  const mockedMailService = createMockMailService();

  const auctionService = new AuctionService(
    mockedAuctionRepository,
    mockedProductService,
    mockedMailService
  );

  describe("Create a new auction", () => {
    const payload = {
      product_id: 1,
      start_time: addDays(new Date(), 1),
      duration_hours: 24
    } as CreateAuctionPayload;

    it("should fail if the user is not the owner of the product", async () => {
      mockedProductService.getProductById.mockResolvedValue({
        id: 1,
        owner_id: user.id + 10
      } as Product);

      await expect(auctionService.createAuction({ user, payload })).rejects.toThrow(
        new BadRequestError("You are not the owner of this product")
      );
    });

    it("should fail if the product is already attached to an auction", async () => {
      mockedProductService.getProductById.mockResolvedValue({
        id: 1,
        owner_id: user.id
      } as Product);

      mockedAuctionRepository.getAuctionsByProductId.mockResolvedValue([
        { id: 1, is_cancelled: false } as Auction
      ]);

      await expect(auctionService.createAuction({ user, payload })).rejects.toThrow(
        new BadRequestError("Product already attached to an auction")
      );
    });

    it("should create a new auction", async () => {
      const product = { id: 1, owner_id: user.id, price: 100 } as Product;

      mockedProductService.getProductById.mockResolvedValue(product);

      mockedAuctionRepository.getAuctionsByProductId.mockResolvedValue([
        { id: 1, is_cancelled: true } as Auction
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

      const newAuction = await auctionService.createAuction({ user, payload });

      expect(mockedMailService.sendEmail).toHaveBeenCalledWith({
        to: user.email,
        template: CreateAuctionTemplate.getTemplate(newAuction, product)
      });
    });
  });
});
