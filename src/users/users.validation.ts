import { z } from "zod";

export const updateUserSchema = z.object({
  stripe_customer_id: z.string().nullable().optional()
});

export type UpdateUserPayload = z.infer<typeof updateUserSchema>;

export const userSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(3).max(100),
  email: z.email(),
  password: z.string().min(8),
  created_at: z.date(),
  updated_at: z.date(),
  stripe_customer_id: z.string().nullable()
});

export type User = z.infer<typeof userSchema>;
