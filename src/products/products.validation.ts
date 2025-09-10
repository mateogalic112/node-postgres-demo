import { fileSchema } from "api/api.validations";
import { z } from "zod";

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(3),
    description: z.string().min(10)
  }),
  file: fileSchema.optional()
});

export type CreateProductPayload = z.infer<typeof createProductSchema>;

export const productSchema = z.object({
  id: z.number().int().positive(),
  owner_id: z.number().int().positive(),
  name: z.string().min(3),
  description: z.string().min(10),
  image_url: z.string().url().nullable(),
  created_at: z.date(),
  updated_at: z.date()
});

export type Product = z.infer<typeof productSchema>;

export const productImageSchema = {
  maxSizeMB: 5,
  allowedFormats: ".jpg|.jpeg|.png|.webp"
};

export const productEmbeddingSchema = z.object({
  id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  embedding: z.array(z.number()).length(1536),
  created_at: z.date(),
  updated_at: z.date()
});

export type ProductEmbedding = z.infer<typeof productEmbeddingSchema>;
