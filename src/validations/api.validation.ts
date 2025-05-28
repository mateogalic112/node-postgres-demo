import { z } from "zod";

export const PaginatedRequestSchema = z.object({
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

export type PaginatedRequestParams = z.infer<typeof PaginatedRequestSchema>["query"];
