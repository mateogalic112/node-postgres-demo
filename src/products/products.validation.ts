import { z } from "zod";

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(3),
    description: z.string().min(10),
    price: z.number().int().positive()
  })
});

export type CreateProductPayload = z.infer<typeof createProductSchema>["body"];
