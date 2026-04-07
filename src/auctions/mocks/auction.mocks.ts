import { CreateAuctionPayload } from "auctions/auctions.validation";
import { addDays } from "date-fns";

export const createMockedAuctionPayload = (productId: number): CreateAuctionPayload => ({
  product_id: productId,
  start_time: addDays(new Date(), 1),
  duration_hours: 24,
  starting_price_in_cents: 1000
});
