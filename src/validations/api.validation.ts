import { z } from "zod";

export const PaginatedRequestSchema = z.object({
  query: z.object({
    limit: z.coerce.number().positive(),
    cursor: z.coerce.number().positive().optional().nullable()
  })
});

export type PaginatedRequestParams = z.infer<typeof PaginatedRequestSchema>["query"];
