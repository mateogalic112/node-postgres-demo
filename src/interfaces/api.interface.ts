export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: {
    id: number;
  } | null;
}

export interface PaginatedRequestParams {
  limit: number;
  cursor?: number | null;
}

// Extend the Express session interface to include user ID
declare module "express" {
  interface Request {
    userId?: number;
  }
}
