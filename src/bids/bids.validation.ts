import { z } from "zod";

export const createBidSchema = z.object({
  auction_id: z.coerce.number().int().positive(),
  amount_in_cents: z.coerce.number().int().positive()
});

export type CreateBidPayload = z.infer<typeof createBidSchema>;

export const bidSchema = z.object({
  id: z.number().int().positive(),
  auction_id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  amount_in_cents: z.coerce.number().int().positive(),
  idempotency_key: z.string(),
  created_at: z.date(),
  updated_at: z.date()
});

export type Bid = z.infer<typeof bidSchema>;
