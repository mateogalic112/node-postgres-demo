import { z } from "zod";

export const userSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(3).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  created_at: z.date(),
  updated_at: z.date()
});

export type User = z.infer<typeof userSchema>;
