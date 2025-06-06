import { PaginatedRequestParams } from "api/api.validations";
import { AuctionRepository } from "./auctions.repository";
import { auctionSchema, CreateAuctionPayload } from "./auctions.validation";
import { BadRequestError, NotFoundError } from "api/api.errors";
import { User } from "users/users.validation";
import { CreateAuctionTemplate, MailService } from "interfaces/mail.interface";
import { ProductService } from "products/products.service";

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

  public async createAuction({ user, payload }: { user: User; payload: CreateAuctionPayload }) {
    const product = await this.productService.getProductById(payload.product_id);
    if (!product) throw new NotFoundError(`Product with id ${payload.product_id} not found`);

    if (product.owner_id !== user.id)
      throw new BadRequestError("You cannot auction another user's product");

    const alreadyInAuction = await this.auctionRepository.getAuctionByProductId(payload.product_id);
    if (alreadyInAuction) throw new BadRequestError("Product already attached to an auction");

    const auction = await this.auctionRepository.createAuction(payload, product.price);

    this.mailService.sendEmail({
      to: user.email,
      template: CreateAuctionTemplate.getTemplate(auction, product)
    });

    return auctionSchema.parse(auction);
  }
}
