import { z } from "zod";

export const createAuctionSchema = z.object({
  product_id: z.number().int().positive(),
  start_time: z.coerce.date(),
  duration_hours: z.number().int().positive()
});

export type CreateAuctionPayload = z.infer<typeof createAuctionSchema>;

export const auctionSchema = z.object({
  id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  winner_id: z.number().int().positive().nullable(),
  start_time: z.date(),
  duration_hours: z.number().int().positive(),
  starting_price: z.coerce.number().int().positive(),
  created_at: z.date(),
  updated_at: z.date()
});

export type Auction = z.infer<typeof auctionSchema>;
