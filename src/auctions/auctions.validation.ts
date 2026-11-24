import { isFuture } from "date-fns";
import { z } from "zod";

const MINIMUM_AUCTION_DURATION_IN_HOURS = 24;
const MINIMUM_STARTING_PRICE_IN_CENTS = 100;

export const createAuctionSchema = z.object({
  product_id: z.number().int().positive(),
  start_time: z.coerce.date().refine(isFuture, "Auction start time must be in the future"),
  duration_hours: z
    .number()
    .int()
    .positive()
    .min(
      MINIMUM_AUCTION_DURATION_IN_HOURS,
      `Auction duration must be at least ${MINIMUM_AUCTION_DURATION_IN_HOURS} hours`
    ),
  starting_price_in_cents: z.coerce
    .number()
    .int()
    .positive()
    .min(
      MINIMUM_STARTING_PRICE_IN_CENTS,
      `Starting price must be at least ${MINIMUM_STARTING_PRICE_IN_CENTS} cents`
    )
});

export type CreateAuctionPayload = z.infer<typeof createAuctionSchema>;

export const auctionRoomSchema = z.object({
  auction_id: z.number().int().positive()
});

export const auctionSchema = z.object({
  id: z.number().int().positive(),
  creator_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  winner_id: z.number().int().positive().nullable(),
  start_time: z.date(),
  duration_hours: z.number().int().positive(),
  starting_price_in_cents: z.coerce.number().int().positive(),
  is_cancelled: z.boolean(),
  created_at: z.date(),
  updated_at: z.date()
});

export type Auction = z.infer<typeof auctionSchema>;
