import { PaginatedRequestParams } from "api/api.validations";
import { AuctionRepository } from "./auctions.repository";
import { Auction, auctionSchema, CreateAuctionPayload } from "./auctions.validation";
import { BadRequestError, NotFoundError, PgError } from "api/api.errors";
import { User } from "users/users.validation";
import { CreateAuctionTemplate, MailService } from "interfaces/mail.interface";
import { addHours, isBefore, isPast } from "date-fns";
import { PostgresService } from "services/postgres.service";

export class AuctionService {
  constructor(
    private readonly auctionRepository: AuctionRepository,
    private readonly mailService: MailService
  ) {}

  public async getAuctions(params: PaginatedRequestParams) {
    const auctions = await this.auctionRepository.getAuctions(params);
    return auctions.map((auction) => auctionSchema.parse(auction));
  }

  public async getAuctionById(id: number) {
    const auction = await this.auctionRepository.findAuctionById(id);
    if (!auction) {
      throw new NotFoundError(`Auction with id ${id} not found`);
    }
    return auctionSchema.parse(auction);
  }

  public async createAuction({ user, payload }: { user: User; payload: CreateAuctionPayload }) {
    const client = await PostgresService.getInstance().connect();

    try {
      await client.query("BEGIN");
      const newAuction = await this.auctionRepository.createAuction(client, user, payload);
      await client.query("COMMIT");

      this.mailService.sendEmail({
        to: user.email,
        template: CreateAuctionTemplate.getTemplate(newAuction)
      });

      return auctionSchema.parse(newAuction);
    } catch (error) {
      if (PgError.isUniqueViolation(error)) {
        const errorMessage = "Product already auctioned. Please try again.";
        throw new PgError(errorMessage, 409);
      }

      if (PgError.isSerializationFailure(error)) {
        const errorMessage = "High bidding activity detected. Please try again.";
        throw new PgError(errorMessage, 409);
      }

      if (PgError.isViolatingForeignKeyConstraint(error)) {
        const errorMessage = "Product not found. Please try again.";
        throw new PgError(errorMessage, 404);
      }

      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async cancelAuction({ user, auctionId }: { user: User; auctionId: number }) {
    const auction = await this.getAuctionById(auctionId);

    if (auction.creator_id !== user.id) {
      throw new BadRequestError("You are not the creator of this auction");
    }

    this.assertAuctionIsScheduled(auction);

    const updatedAuction = await this.auctionRepository.cancelAuction(user.id, auctionId);
    return auctionSchema.parse(updatedAuction);
  }

  public assertAuctionIsActive(auction: Auction) {
    if (!this.hasAuctionStarted(auction)) {
      throw new BadRequestError("Auction has not started yet");
    }

    if (this.hasAuctionEnded(auction)) {
      throw new BadRequestError("Auction has ended");
    }

    if (auction.is_cancelled) {
      throw new BadRequestError("Auction has been cancelled");
    }
  }

  public assertAuctionIsScheduled(auction: Auction) {
    if (this.hasAuctionEnded(auction)) {
      throw new BadRequestError("Auction has ended");
    }

    if (auction.is_cancelled) {
      throw new BadRequestError("Auction has been cancelled");
    }
  }

  public getAuctionRoomName(namespace: string, auctionId: number) {
    return `${namespace}-${auctionId}`;
  }

  private hasAuctionStarted(auction: Auction) {
    return isBefore(auction.start_time, new Date());
  }

  private hasAuctionEnded(auction: Auction) {
    return isPast(addHours(auction.start_time, auction.duration_hours));
  }
}
