import { z } from "zod";

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(3),
    description: z.string().min(10),
    price: z.number().int().positive()
  })
});

export type CreateProductPayload = z.infer<typeof createProductSchema>["body"];

export const PaginatedProductsRequestSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .regex(/^\d+$/, "Limit must be a positive integer")
      .transform(Number)
      .refine((value) => value > 0, "Limit must be greater than 0"),
    cursor: z
      .string()
      .regex(/^\d+$/, "Cursor must be a positive integer")
      .transform(Number)
      .optional()
      .nullable()
  })
});
