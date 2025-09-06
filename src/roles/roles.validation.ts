import { z } from "zod";

export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(3),
    description: z.string().min(10)
  })
});

export type CreateRolePayload = z.infer<typeof createRoleSchema>;

export const roleSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2),
  description: z.string().min(4),
  created_at: z.date(),
  updated_at: z.date()
});

export type Role = z.infer<typeof roleSchema>;
