import { AuctionService } from "auctions/auctions.service";
import { BidRepository } from "./bids.repository";
import { bidSchema, CreateBidPayload } from "./bids.validation";
import { BadRequestError, NotFoundError } from "api/api.errors";
import { addHours, isPast } from "date-fns";
import { User } from "users/users.validation";
import { ProductService } from "products/products.service";

export class BidService {
  constructor(
    private readonly bidRepository: BidRepository,
    private readonly auctionService: AuctionService,
    private readonly productService: ProductService
  ) {}

  public async createBid({ user, payload }: { user: User; payload: CreateBidPayload }) {
    const auction = await this.auctionService.getAuctionById(payload.auction_id);
    if (!auction) throw new NotFoundError(`Auction with id ${payload.auction_id} not found`);

    if (isPast(addHours(auction.start_time, auction.duration_hours)))
      throw new BadRequestError("Auction has ended");

    const product = await this.productService.getProductById(auction.product_id);
    if (!product) throw new NotFoundError(`Product with id ${auction.product_id} not found`);

    if (product.owner_id === user.id)
      throw new BadRequestError("You cannot bid on your own auction");

    const MIN_BID_INCREASE_AMOUNT = auction.starting_price * 0.1;

    const highestBid = Math.max(
      await this.bidRepository.getHighestAuctionBidAmount(auction.id),
      auction.starting_price
    );

    if (payload.amount < highestBid + MIN_BID_INCREASE_AMOUNT)
      throw new BadRequestError(
        `Bid amount must be greater than ${highestBid + MIN_BID_INCREASE_AMOUNT}`
      );

    const bid = await this.bidRepository.createBid(user.id, payload);
    return bidSchema.parse(bid);
  }
}
