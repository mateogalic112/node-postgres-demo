import { fileSchema } from "api/api.validations";
import { z } from "zod";

const MINIMUM_NAME_LENGTH = 3;
const MINIMUM_DESCRIPTION_LENGTH = 10;

export const createProductSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(MINIMUM_NAME_LENGTH, `Name should be at minimum ${MINIMUM_NAME_LENGTH} chars`),
    description: z
      .string()
      .min(
        MINIMUM_DESCRIPTION_LENGTH,
        `Description should be at minimum ${MINIMUM_DESCRIPTION_LENGTH} chars`
      ),
    price_in_cents: z.coerce.number().int().positive()
  }),
  file: fileSchema.optional()
});

export const MAX_IMAGE_SIZE_IN_MB = 5;

export type CreateProductPayload = z.infer<typeof createProductSchema>;

export const productSchema = z.object({
  id: z.number().int().positive(),
  owner_id: z.number().int().positive(),
  name: z.string().min(3),
  description: z.string().min(10),
  image_url: z.url().nullable(),
  price_in_cents: z.number().int().positive(),
  created_at: z.date(),
  updated_at: z.date()
});

export type Product = z.infer<typeof productSchema>;

export const productEmbeddingSchema = z.object({
  id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  embedding: z.array(z.number()).length(1536),
  created_at: z.date(),
  updated_at: z.date()
});

export type ProductEmbedding = z.infer<typeof productEmbeddingSchema>;
