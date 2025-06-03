import { z } from "zod";

export const paginatedRequestSchema = z.object({
  limit: z.coerce.number().positive(),
  cursor: z.coerce.number().positive().optional().nullable()
});

export type PaginatedRequestParams = z.infer<typeof paginatedRequestSchema>;

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    nextCursor: z
      .object({
        id: z.number().int().positive()
      })
      .nullable()
  });
