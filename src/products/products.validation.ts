import { z } from "zod";

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(3),
    description: z.string().min(10),
    price: z.number().int().positive(),
    image_url: z.string().url().nullable()
  })
});

export type CreateProductPayload = z.infer<typeof createProductSchema>["body"];

export const productSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(3),
  description: z.string().min(10),
  image_url: z.string().url().nullable(),
  price: z.coerce
    .number()
    .int()
    .positive()
    .transform((val) => parseInt(val.toString(), 10)),
  created_at: z.date(),
  updated_at: z.date()
});

export type Product = z.infer<typeof productSchema>;
