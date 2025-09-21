import { z } from "zod";

export enum RoleName {
  ADMIN = "admin",
  USER = "user"
}

export const createRoleSchema = z.object({
  body: z.object({
    name: z.enum(Object.values(RoleName)),
    description: z.string().min(10)
  })
});

export type CreateRolePayload = z.infer<typeof createRoleSchema>;

export const roleSchema = z.object({
  id: z.number().int().positive(),
  name: z.enum(Object.values(RoleName)),
  description: z.string().min(4),
  created_at: z.date(),
  updated_at: z.date()
});

export type Role = z.infer<typeof roleSchema>;
