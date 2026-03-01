import path from "path";
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

export const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

export function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return EXTENSION_TO_MIME[ext] ?? "application/octet-stream";
}
