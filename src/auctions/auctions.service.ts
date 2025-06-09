import { PaginatedRequestParams } from "api/api.validations";
import { AuctionRepository } from "./auctions.repository";
import { Auction, auctionSchema, CreateAuctionPayload } from "./auctions.validation";
import { BadRequestError, NotFoundError } from "api/api.errors";
import { User } from "users/users.validation";
import { CreateAuctionTemplate, MailService } from "interfaces/mail.interface";
import { ProductService } from "products/products.service";
import { addHours, isAfter, isPast } from "date-fns";

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

  public async findAuctionById(id: number) {
    const auction = await this.auctionRepository.findAuctionById(id);
    if (!auction) {
      return null;
    }
    return auctionSchema.parse(auction);
  }

  public async createAuction({ user, payload }: { user: User; payload: CreateAuctionPayload }) {
    const product = await this.productService.getProductById(payload.product_id);

    this.productService.assertProductOwner(product, user);

    await this.assertProductIsAvailable(payload.product_id);

    const newAuction = await this.auctionRepository.createAuction(payload, product.price);

    this.mailService.sendEmail({
      to: user.email,
      template: CreateAuctionTemplate.getTemplate(newAuction, product)
    });

    return auctionSchema.parse(newAuction);
  }

  private hasAuctionStarted(auction: Auction) {
    return isAfter(auction.start_time, new Date());
  }

  private hasAuctionEnded(auction: Auction) {
    return isPast(addHours(auction.start_time, auction.duration_hours));
  }

  public async getAuctionById(id: number) {
    const auction = await this.findAuctionById(id);
    if (!auction) {
      throw new NotFoundError(`Auction with id ${id} not found`);
    }
    return auctionSchema.parse(auction);
  }

  public assertAuctionIsActive(auction: Auction) {
    if (!this.hasAuctionStarted(auction)) {
      throw new BadRequestError("Auction has not started yet");
    }

    if (this.hasAuctionEnded(auction)) {
      throw new BadRequestError("Auction has ended");
    }
  }

  public async assertAuctionOwner(auction: Auction, user: User) {
    const product = await this.productService.getProductById(auction.product_id);
    if (product.owner_id === user.id)
      throw new BadRequestError("You cannot bid on your own auction");
  }

  private async assertProductIsAvailable(productId: number) {
    const productAuctions = await this.auctionRepository.getAuctionsByProductId(productId);
    if (productAuctions.some((auction) => auction.winner_id)) {
      throw new BadRequestError("Product already attached to an auction");
    }
  }
}
