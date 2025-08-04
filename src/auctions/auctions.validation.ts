import { isFuture } from "date-fns";
import { z } from "zod";

export const createAuctionSchema = z.object({
  product_id: z.number().int().positive(),
  start_time: z.coerce.date().refine(isFuture, "Auction start time must be in the future"),
  duration_hours: z.number().int().positive().min(24, "Auction duration must be at least 24 hours"),
  starting_price_in_cents: z.coerce
    .number()
    .int()
    .positive()
    .min(100, "Starting price must be at least 100 cents")
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
