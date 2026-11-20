import { z } from "zod";

export const customerSchema = z.object({
  user_id: z.number().int().positive(),
  customer_id: z.string(),
  created_at: z.date(),
  updated_at: z.date()
});
export type Customer = z.infer<typeof customerSchema>;
