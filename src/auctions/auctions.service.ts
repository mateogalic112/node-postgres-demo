import { PaginatedRequestParams } from "api/api.validations";
import { AuctionRepository } from "./auctions.repository";
import { Auction, auctionSchema, CreateAuctionPayload } from "./auctions.validation";
import { BadRequestError, NotFoundError } from "api/api.errors";
import { User } from "users/users.validation";
import { CreateAuctionTemplate, MailService } from "interfaces/mail.interface";
import { ProductService } from "products/products.service";
import { addHours, isBefore, isPast } from "date-fns";

export class AuctionService {
  constructor(
    private readonly auctionRepository: AuctionRepository,
    private readonly productService: ProductService,
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
    const product = await this.productService.getProductById(payload.product_id);

    if (product.owner_id !== user.id) {
      throw new BadRequestError("You are not the owner of this product");
    }

    await this.assertProductIsAvailable(payload.product_id);

    const newAuction = await this.auctionRepository.createAuction(user, payload, product.price);

    this.mailService.sendEmail({
      to: user.email,
      template: CreateAuctionTemplate.getTemplate(newAuction, product)
    });

    return auctionSchema.parse(newAuction);
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

  private hasAuctionStarted(auction: Auction) {
    return isBefore(auction.start_time, new Date());
  }

  private hasAuctionEnded(auction: Auction) {
    return isPast(addHours(auction.start_time, auction.duration_hours));
  }

  private async assertProductIsAvailable(productId: number) {
    const productAuctions = await this.auctionRepository.getAuctionsByProductId(productId);
    if (!productAuctions.every((auction) => auction.is_cancelled)) {
      throw new BadRequestError("Product already attached to an auction");
    }
  }
}
