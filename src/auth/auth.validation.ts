import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

export type RegisterPayload = z.infer<typeof registerSchema>["body"];
