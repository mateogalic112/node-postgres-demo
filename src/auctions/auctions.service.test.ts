import { AuctionService } from "./auctions.service";
import { User } from "users/users.validation";
import { subDays } from "date-fns";
import { BadRequestError } from "api/api.errors";
import { Auction } from "./auctions.validation";
import {
  createMockAuctionRepository,
  createMockMailService,
  mockAuction
} from "./mocks/auction.service";
import { DatabaseService } from "interfaces/database.interface";

describe("AuctionService", () => {
  const user = { id: 1 } as User;

  const mockedAuctionRepository = createMockAuctionRepository();
  const mockedMailService = createMockMailService();

  const DB: DatabaseService = {
    query: jest.fn(),
    getClient: jest.fn()
  };

  const auctionService = new AuctionService(mockedAuctionRepository, DB, mockedMailService);

  describe("Cancel an auction", () => {
    it("should fail if the user is not the creator of the auction", async () => {
      const auction = { ...mockAuction(user), id: 1, creator_id: user.id + 10 };

      mockedAuctionRepository.findAuctionById.mockResolvedValue(auction);

      await expect(auctionService.cancelAuction({ user, auctionId: 1 })).rejects.toThrow(
        new BadRequestError("You are not the creator of this auction")
      );
    });

    it("should fail if the auction has already ended", async () => {
      const auction = { ...mockAuction(user), id: 1, start_time: subDays(new Date(), 2) };

      mockedAuctionRepository.findAuctionById.mockResolvedValue(auction);

      await expect(auctionService.cancelAuction({ user, auctionId: 1 })).rejects.toThrow(
        new BadRequestError("Auction has ended")
      );
    });

    it("should fail if the auction has been cancelled", async () => {
      const auction = { ...mockAuction(user), id: 1, is_cancelled: true };

      mockedAuctionRepository.findAuctionById.mockResolvedValue(auction);

      await expect(auctionService.cancelAuction({ user, auctionId: 1 })).rejects.toThrow(
        new BadRequestError("Auction has been cancelled")
      );
    });

    it("should cancel the auction", async () => {
      const auction = { ...mockAuction(user), id: 1, is_cancelled: false };

      mockedAuctionRepository.findAuctionById.mockResolvedValue(auction);

      mockedAuctionRepository.cancelAuction.mockResolvedValue({
        ...auction,
        is_cancelled: true
      } as Auction);

      await expect(auctionService.cancelAuction({ user, auctionId: 1 })).resolves.not.toThrow();
    });
  });
});
