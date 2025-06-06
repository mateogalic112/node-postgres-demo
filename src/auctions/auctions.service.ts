import { PaginatedRequestParams } from "api/api.validations";
import { AuctionRepository } from "./auctions.repository";
import { auctionSchema, CreateAuctionPayload } from "./auctions.validation";
import { ProductRepository } from "products/products.repository";
import { BadRequestError, NotFoundError } from "api/api.errors";
import { productSchema } from "products/products.validation";

export class AuctionService {
  constructor(
    private readonly auctionRepository: AuctionRepository,
    private readonly productRepository: ProductRepository
  ) {}

  public async getAuctions(params: PaginatedRequestParams) {
    const auctions = await this.auctionRepository.getAuctions(params);
    return auctions.map((auction) => auctionSchema.parse(auction));
  }

  public async createAuction(payload: CreateAuctionPayload, userId: number) {
    const product = await this.productRepository.getProductById(payload.product_id);
    if (!product) throw new NotFoundError(`Product with id ${payload.product_id} not found`);

    if (product.owner_id !== userId)
      throw new BadRequestError("You cannot auction another user's product");

    const alreadyInAuction = await this.auctionRepository.getAuctionByProductId(payload.product_id);
    if (alreadyInAuction) throw new BadRequestError("Product already attached to an auction");

    const createdAuction = await this.auctionRepository.createAuction(payload, product.price);

    return {
      auction: auctionSchema.parse(createdAuction),
      product: productSchema.parse(product)
    };
  }
}
