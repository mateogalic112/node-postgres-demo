import { z } from "zod";

export const userSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(3).max(100),
  email: z.email(),
  role_id: z.number().int().positive(),
  password: z.string().min(8),
  created_at: z.date(),
  updated_at: z.date()
});
export type User = z.infer<typeof userSchema>;

export const userCustomerSchema = z.object({
  user_id: z.number().int().positive(),
  customer_id: z.string(),
  created_at: z.date(),
  updated_at: z.date()
});
export type UserCustomer = z.infer<typeof userCustomerSchema>;
