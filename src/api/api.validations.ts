import { z } from "zod";

export const paginatedRequestSchema = z.object({
  limit: z.coerce.number().positive(),
  cursor: z.coerce.number().positive().optional().nullable()
});

export type PaginatedRequestParams = z.infer<typeof paginatedRequestSchema>;

export const idSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const fileSchema = z.object({
  buffer: z.instanceof(Buffer),
  mimetype: z.string()
});
